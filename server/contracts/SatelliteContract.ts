import type { ChainId, StateLock, LockStatus, MultiSigApproval } from "../types.ts"
import { LOCK_TIMEOUT_MS, MULTISIG_THRESHOLD } from "../types.ts"
import { ChainNode } from "../chains/ChainNode.ts"

const MULTISIG_SIGNERS = [
  "0xTreasuryOfficer1",
  "0xTreasuryOfficer2",
  "0xTreasuryOfficer3",
  "0xCFO",
  "0xCEO",
]

export class SatelliteContract {
  chainId: ChainId
  private node: ChainNode
  private locks: Map<string, StateLock> = new Map()
  balances: Map<string, Map<string, number>> = new Map()
  private haltedWallets: Set<string> = new Set()
  private reentrancyGuards: Set<string> = new Set()

  constructor(chainId: ChainId, node: ChainNode) {
    this.chainId = chainId
    this.node = node
  }

  setWalletBalance(walletId: string, token: string, amount: number): void {
    if (!this.balances.has(walletId)) {
      this.balances.set(walletId, new Map())
    }
    this.balances.get(walletId)!.set(token, amount)
  }

  getWalletBalance(walletId: string, token: string): number {
    return this.balances.get(walletId)?.get(token) ?? 0
  }

  getAllWalletBalances(walletId: string): Record<string, number> {
    const result: Record<string, number> = {}
    const walletBalances = this.balances.get(walletId)
    if (walletBalances) {
      for (const [token, amount] of walletBalances) {
        result[token] = amount
      }
    }
    return result
  }

  registerStateLock(lock: StateLock): void {
    this.locks.set(lock.id, lock)
  }

  transitionLock(lockId: string, status: LockStatus): StateLock | null {
    const lock = this.locks.get(lockId)
    if (!lock) return null

    lock.status = status
    if (status === "LOCKED") lock.lockedAt = Date.now()
    if (status === "RESOLVED" || status === "EMERGENCY_UNLOCKED") lock.resolvedAt = Date.now()

    if (status === "LOCKED") {
      this.haltedWallets.add(lock.walletId)
    }

    if (status === "RESOLVED" || status === "EMERGENCY_UNLOCKED" || status === "IDLE") {
      this.haltedWallets.delete(lock.walletId)
      this.reentrancyGuards.delete(lock.walletId)
    }

    return lock
  }

  // ── Reentrancy Guard ──────────────────────────────────────────

  acquireReentrancyGuard(walletId: string): boolean {
    if (this.reentrancyGuards.has(walletId)) return false
    this.reentrancyGuards.add(walletId)
    return true
  }

  releaseReentrancyGuard(walletId: string): void {
    this.reentrancyGuards.delete(walletId)
  }

  // ── Emergency Escape Hatch ────────────────────────────────────

  addMultiSigApproval(
    lockId: string,
    signer: string,
  ): boolean {
    const lock = this.locks.get(lockId)
    if (!lock) return false
    if (lock.status !== "LOCKED") return false

    if (!MULTISIG_SIGNERS.includes(signer)) return false

    const alreadySigned = lock.multiSigApprovals.some((a) => a.signer === signer)
    if (alreadySigned) return false

    const approval: MultiSigApproval = {
      lockId,
      signer,
      approvedAt: Date.now(),
      signature: `0x${signer.slice(2)}_sig_${Date.now().toString(16)}`,
    }
    lock.multiSigApprovals.push(approval)

    return lock.multiSigApprovals.length >= MULTISIG_THRESHOLD
  }

  triggerEmergencyUnlock(
    lockId: string,
    caller: string,
  ): { success: boolean; reason: string } {
    const lock = this.locks.get(lockId)
    if (!lock) return { success: false, reason: "Lock not found" }

    if (lock.status !== "LOCKED") {
      return { success: false, reason: `Wallet state is ${lock.status}, not LOCKED` }
    }

    const timeExpired =
      lock.lockedAt !== null &&
      Date.now() - lock.lockedAt >= lock.emergencyTimeoutMs

    if (!timeExpired) {
      const remaining = Math.ceil(((lock.lockedAt ?? Date.now()) + lock.emergencyTimeoutMs - Date.now()) / 1000)
      return { success: false, reason: `Timeout not expired. ${remaining}s remaining` }
    }

    const hasMultiSig = lock.multiSigApprovals.length >= MULTISIG_THRESHOLD
    if (!hasMultiSig) {
      return {
        success: false,
        reason: `Insufficient multi-sig approvals (${lock.multiSigApprovals.length}/${MULTISIG_THRESHOLD})`,
      }
    }

    lock.status = "EMERGENCY_UNLOCKED"
    lock.resolvedAt = Date.now()
    lock.emergencyUnlockedBy = caller
    lock.emergencyUnlockedAt = Date.now()

    this.haltedWallets.delete(lock.walletId)
    this.reentrancyGuards.delete(lock.walletId)

    return { success: true, reason: "Emergency unlock executed" }
  }

  getStaleLocks(): StateLock[] {
    const now = Date.now()
    const stale: StateLock[] = []
    for (const lock of this.locks.values()) {
      if (
        lock.status === "LOCKED" &&
        lock.lockedAt !== null &&
        now - lock.lockedAt >= lock.emergencyTimeoutMs
      ) {
        stale.push(lock)
      }
    }
    return stale
  }

  checkEmergencyStatus(lockId: string): {
    timeExpired: boolean
    approvals: number
    threshold: number
    remainingMs: number
    unlockable: boolean
  } {
    const lock = this.locks.get(lockId)
    if (!lock || lock.lockedAt === null) {
      return { timeExpired: false, approvals: 0, threshold: MULTISIG_THRESHOLD, remainingMs: 0, unlockable: false }
    }

    const timeExpired = Date.now() - lock.lockedAt >= lock.emergencyTimeoutMs
    const remainingMs = Math.max(0, lock.lockedAt + lock.emergencyTimeoutMs - Date.now())
    const approvals = lock.multiSigApprovals.length
    const unlockable = timeExpired && approvals >= MULTISIG_THRESHOLD

    return { timeExpired, approvals, threshold: MULTISIG_THRESHOLD, remainingMs, unlockable }
  }

  // ── Wallet state checks ───────────────────────────────────────

  isWalletHalted(walletId: string): boolean {
    return this.haltedWallets.has(walletId)
  }

  canExecuteOutbound(walletId: string): boolean {
    return !this.haltedWallets.has(walletId) && !this.reentrancyGuards.has(walletId) && this.node.state.isOnline
  }

  getLockedWallets(): string[] {
    return Array.from(this.haltedWallets)
  }

  async debit(walletId: string, token: string, amount: number): Promise<boolean> {
    if (!this.canExecuteOutbound(walletId)) return false
    if (!this.acquireReentrancyGuard(walletId)) return false

    try {
      const walletBalances = this.balances.get(walletId)
      if (!walletBalances) return false

      const current = walletBalances.get(token) ?? 0
      if (current < amount) return false

      walletBalances.set(token, current - amount)
      return true
    } finally {
      this.releaseReentrancyGuard(walletId)
    }
  }

  async credit(walletId: string, token: string, amount: number): Promise<boolean> {
    if (!this.balances.has(walletId)) {
      this.balances.set(walletId, new Map())
    }

    const walletBalances = this.balances.get(walletId)!
    const current = walletBalances.get(token) ?? 0
    walletBalances.set(token, current + amount)
    return true
  }

  getActiveLocks(): StateLock[] {
    return Array.from(this.locks.values()).filter(
      (l) => l.status === "LOCKED" || l.status === "PENDING"
    )
  }

  async waitForFinality(blockNumber: number): Promise<void> {
    const finalityBlock = this.node.getFinalityBlock(blockNumber)
    if (this.node.state.currentBlock >= finalityBlock) return
    await this.node.waitForBlocks(finalityBlock - this.node.state.currentBlock)
  }
}
