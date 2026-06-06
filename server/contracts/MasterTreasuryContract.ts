import { v4 as uuid } from "uuid"
import type {
  ChainId,
  Batch,
  CrossChainOperation,
  StateLock,
  TreasuryWallet,
  LogEntry,
  GasSavingsEstimate,
  AuditRecord,
} from "../types.ts"
import { LOCK_TIMEOUT_MS, MULTISIG_THRESHOLD } from "../types.ts"
import { SatelliteContract } from "./SatelliteContract.ts"
import type { SharedSequencer } from "../sequencer/SharedSequencer.ts"

// Traditional async bridging costs per operation:
// - L1 settlement: ~$12
// - AMM swap fee: ~0.3% ($30-300 per move)
// - Bridge relay: ~$8
// - Total per cross-chain move: ~$50-320
// ClearingHouse.OS: shared-sequencer batch, single L1 settlement → ~$3/op
const TRADITIONAL_COST_PER_OP = 50
const CLEARINGHOUSE_COST_PER_OP = 3

export class MasterTreasuryContract {
  masterWallet: TreasuryWallet
  private satellites: Map<ChainId, SatelliteContract> = new Map()
  private sequencer: SharedSequencer | null = null
  private batches: Map<string, Batch> = new Map()
  private completedBatches: Batch[] = []
  private logEntries: LogEntry[] = []
  private auditRecords: AuditRecord[] = []
  totalRebalanced = 0
  totalStateLocks = 0
  totalOperationsProcessed = 0

  constructor() {
    this.masterWallet = {
      id: "treasury-main",
      label: "ClearingHouse.OS Master Treasury",
      balances: { base: 0, optimism: 0, arbitrum: 0 },
      tokens: ["USDC", "USDT", "DAI"],
    }
  }

  setSequencer(seq: SharedSequencer): void {
    this.sequencer = seq
  }

  registerSatellite(chainId: ChainId, satellite: SatelliteContract): void {
    this.satellites.set(chainId, satellite)
    this.recomputeMasterBalances()
  }

  deposit(chainId: ChainId, token: string, amount: number): void {
    const satellite = this.satellites.get(chainId)
    if (!satellite) throw new Error(`No satellite for ${chainId}`)
    satellite.credit(this.masterWallet.id, token, amount)
    this.recomputeMasterBalances()
    this.log("info", `Deposit: +${amount} ${token} on ${chainId.toUpperCase()}`, undefined, chainId, "deposit")
  }

  getDepositInstructions(): {
    chainId: ChainId
    name: string
    address: string
    rpc: string
  }[] {
    return Object.values(this.satellites).map((sat) => ({
      chainId: sat.chainId,
      name: sat.chainId.toUpperCase(),
      address: `0x${sat.chainId}${"0".repeat(36)}`,
      rpc: `https://${sat.chainId}.clearinghouse.io/rpc`,
    }))
  }

  // ── Gas savings computation ───────────────────────────────────

  getGasSavingsEstimate(): GasSavingsEstimate {
    const totalOps = this.totalOperationsProcessed
    const gasHopsAvoided = totalOps // each op avoids L1 bridge + AMM hop
    const traditionalCost = totalOps * TRADITIONAL_COST_PER_OP
    const clearinghouseCost = totalOps * CLEARINGHOUSE_COST_PER_OP
    const savings = traditionalCost - clearinghouseCost
    const savingsPercent = traditionalCost > 0 ? Math.round((savings / traditionalCost) * 100) : 0

    return {
      traditionalCostUsd: traditionalCost,
      clearinghouseCostUsd: clearinghouseCost,
      savingsUsd: savings,
      savingsPercent,
      totalOperationsSaved: totalOps,
      totalGasHopsAvoided: gasHopsAvoided,
    }
  }

  // ── Emergency escape hatch ────────────────────────────────────

  approveEmergencyUnlock(
    lockId: string,
    signer: string,
  ): { success: boolean; reason: string } {
    for (const sat of this.satellites.values()) {
      const reachedThreshold = sat.addMultiSigApproval(lockId, signer)
      if (reachedThreshold) {
        this.log("warn", `Multi-sig threshold reached for lock ${lockId.slice(0, 8)}`, undefined, undefined, "emergency")
        return { success: true, reason: "Multi-sig threshold reached" }
      }
      const lock = sat.checkEmergencyStatus(lockId)
      if (lock.approvals > 0) {
        return { success: true, reason: `Approval added (${lock.approvals}/${lock.threshold})` }
      }
    }
    return { success: false, reason: "Lock not found on any satellite" }
  }

  triggerEmergencyUnlock(
    lockId: string,
    caller: string,
  ): { success: boolean; reason: string } {
    for (const sat of this.satellites.values()) {
      const result = sat.triggerEmergencyUnlock(lockId, caller)
      if (result.success) {
        this.log("warn", `EMERGENCY UNLOCK by ${caller}: lock ${lockId.slice(0, 8)} force-resolved`, undefined, undefined, "emergency")
        this.recomputeMasterBalances()
        return result
      }
      // Non-empty reason means the lock was found but couldn't unlock
      if (result.reason !== "Lock not found") return result
    }
    return { success: false, reason: "Lock not found on any satellite" }
  }

  getStaleLocks(): StateLock[] {
    const stale: StateLock[] = []
    for (const sat of this.satellites.values()) {
      stale.push(...sat.getStaleLocks())
    }
    return stale
  }

  checkLockEmergencyStatus(lockId: string): ReturnType<SatelliteContract["checkEmergencyStatus"]> {
    for (const sat of this.satellites.values()) {
      const status = sat.checkEmergencyStatus(lockId)
      if (status.approvals > 0 || status.remainingMs > 0) return status
    }
    const zero = this.satellites.values().next().value
    return zero ? zero.checkEmergencyStatus(lockId) : { timeExpired: false, approvals: 0, threshold: MULTISIG_THRESHOLD, remainingMs: 0, unlockable: false }
  }

  // ── Audit log ─────────────────────────────────────────────────

  private log(
    level: LogEntry["level"],
    message: string,
    batchId?: string,
    chainId?: ChainId,
    category?: LogEntry["category"],
  ): void {
    const entry: LogEntry = {
      id: uuid(),
      timestamp: Date.now(),
      level,
      message,
      batchId,
      chainId,
      category: category ?? "system",
    }
    this.logEntries.push(entry)
    if (this.logEntries.length > 500) this.logEntries.shift()

    const auditRecord: AuditRecord = {
      id: entry.id,
      timestamp: entry.timestamp,
      isoDate: new Date(entry.timestamp).toISOString(),
      category: entry.category ?? "system",
      level: entry.level,
      chainId: chainId ?? "-",
      batchId: batchId ?? "-",
      amount: null,
      token: null,
      message: entry.message,
    }
    this.auditRecords.push(auditRecord)
    if (this.auditRecords.length > 2000) this.auditRecords.splice(0, this.auditRecords.length - 2000)

    const prefix = { info: "ℹ", warn: "⚠", error: "✗", success: "✓" }[level]
    console.log(`[Master] ${prefix} ${message}`)
  }

  getAuditRecords(limit = 2000): AuditRecord[] {
    return this.auditRecords.slice(-limit)
  }

  // ── Rebalance flow ────────────────────────────────────────────

  async initiateRebalance(
    operations: CrossChainOperation[],
    customWalletId?: string,
  ): Promise<Batch> {
    const walletId = customWalletId ?? this.masterWallet.id
    const batch: Batch = {
      id: uuid(),
      walletId,
      operations,
      stateLocks: [],
      status: "BUILDING",
      createdAt: Date.now(),
      submittedAt: null,
      confirmedAt: null,
      executedAt: null,
      error: null,
    }

    this.batches.set(batch.id, batch)
    this.log("info", `Rebalance batch ${batch.id.slice(0, 8)} initiated — ${operations.length} operations`, batch.id, undefined, "rebalance")

    const involvedChains = [...new Set(operations.map((op) => op.chainId))]
    this.log("info", `Chains involved: ${involvedChains.join(", ")}`, batch.id, undefined, "rebalance")

    for (const chainId of involvedChains) {
      const lock: StateLock = {
        id: uuid(),
        batchId: batch.id,
        walletId,
        chainId,
        status: "PENDING",
        lockedAt: null,
        resolvedAt: null,
        emergencyTimeoutMs: LOCK_TIMEOUT_MS,
        multiSigApprovals: [],
        emergencyUnlockedBy: null,
        emergencyUnlockedAt: null,
      }

      const satellite = this.satellites.get(chainId)
      if (!satellite) {
        batch.status = "FAILED"
        batch.error = `No satellite for chain ${chainId}`
        this.log("error", `No satellite for chain ${chainId}`, batch.id, chainId, "rebalance")
        return batch
      }

      satellite.registerStateLock(lock)
      satellite.transitionLock(lock.id, "LOCKED")
      batch.stateLocks.push(lock)
      this.totalStateLocks++

      this.log("info", `State lock acquired on ${chainId.toUpperCase()} for wallet ${walletId}`, batch.id, chainId, "state_lock")
    }

    if (!this.sequencer) {
      batch.status = "FAILED"
      batch.error = "No sequencer registered"
      this.log("error", "No sequencer registered", batch.id, undefined, "rebalance")
      return batch
    }

    this.log("info", `Submitting batch to shared sequencer`, batch.id, undefined, "rebalance")
    const result = await this.sequencer.submitBatch(batch)
    return result
  }

  onBatchConfirmed(batch: Batch): void {
    batch.status = "CONFIRMED"
    batch.confirmedAt = Date.now()
    this.log("success", `Batch ${batch.id.slice(0, 8)} confirmed by sequencer — firing execution trigger`, batch.id, undefined, "execution")
    this.executeBatch(batch)
  }

  onBatchRejected(batch: Batch, reason: string): void {
    batch.status = "FAILED"
    batch.error = reason
    this.log("error", `Batch ${batch.id.slice(0, 8)} rejected: ${reason}`, batch.id, undefined, "execution")

    for (const lock of batch.stateLocks) {
      const satellite = this.satellites.get(lock.chainId)
      if (satellite) {
        satellite.transitionLock(lock.id, "IDLE")
        this.log("warn", `State lock released on ${lock.chainId.toUpperCase()} (rejection)`, batch.id, lock.chainId, "state_lock")
      }
    }
  }

  private async executeBatch(batch: Batch): Promise<void> {
    this.log("info", `Executing batch: ${batch.id.slice(0, 8)}`, batch.id, undefined, "execution")

    try {
      for (const lock of batch.stateLocks) {
        const satellite = this.satellites.get(lock.chainId)
        if (satellite) {
          satellite.transitionLock(lock.id, "RESOLVED")
          this.log("success", `State lock RESOLVED on ${lock.chainId.toUpperCase()}`, batch.id, lock.chainId, "execution")
        }
      }

      for (const op of batch.operations) {
        const satellite = this.satellites.get(op.chainId)
        if (!satellite) continue

        const auditEntry: AuditRecord = {
          id: uuid(),
          timestamp: Date.now(),
          isoDate: new Date().toISOString(),
          category: op.type === "debit" ? "rebalance" : "rebalance",
          level: "success",
          chainId: op.chainId,
          batchId: batch.id,
          amount: op.amount,
          token: op.token,
          message: "",
        }

        if (op.type === "debit") {
          const success = await satellite.debit(batch.walletId, op.token, op.amount)
          if (!success) {
            this.log("error", `Debit failed on ${op.chainId}: ${op.amount} ${op.token}`, batch.id, op.chainId, "execution")
            auditEntry.level = "error"
            auditEntry.message = `DEBIT FAILED: ${op.amount} ${op.token} from ${op.chainId}`
          } else {
            this.log("success", `Debited ${op.amount} ${op.token} from ${op.chainId.toUpperCase()}`, batch.id, op.chainId, "execution")
            auditEntry.message = `DEBIT: ${op.amount} ${op.token} from ${op.chainId}`
          }
          this.auditRecords.push(auditEntry)
        } else if (op.type === "credit") {
          const success = await satellite.credit(batch.walletId, op.token, op.amount)
          if (success) {
            this.log("success", `Credited ${op.amount} ${op.token} to ${op.chainId.toUpperCase()}`, batch.id, op.chainId, "execution")
            auditEntry.message = `CREDIT: ${op.amount} ${op.token} to ${op.chainId}`
            this.auditRecords.push(auditEntry)
          }
        }
      }

      batch.status = "EXECUTED"
      batch.executedAt = Date.now()

      const totalAmount = batch.operations
        .filter((op) => op.type === "debit")
        .reduce((sum, op) => sum + op.amount, 0)
      this.totalRebalanced += totalAmount
      this.totalOperationsProcessed += batch.operations.length

      this.batches.delete(batch.id)
      this.completedBatches.push(batch)
      if (this.completedBatches.length > 100) this.completedBatches.shift()

      this.log("success", `Batch ${batch.id.slice(0, 8)} executed. Total rebalanced: $${(this.totalRebalanced / 1e6).toFixed(2)}M`, batch.id, undefined, "execution")
      this.recomputeMasterBalances()
    } catch (err) {
      batch.status = "FAILED"
      batch.error = err instanceof Error ? err.message : "Unknown execution error"
      this.log("error", `Execution failed: ${batch.error}`, batch.id, undefined, "execution")
    }
  }

  private recomputeMasterBalances(): void {
    for (const chainId of ["base", "optimism", "arbitrum"] as ChainId[]) {
      const satellite = this.satellites.get(chainId)
      if (!satellite) continue

      let total = 0
      const walletBalances = satellite.getAllWalletBalances(this.masterWallet.id)
      for (const amount of Object.values(walletBalances)) {
        total += amount
      }
      this.masterWallet.balances[chainId] = total
    }
  }

  getActiveBatches(): Batch[] {
    return Array.from(this.batches.values())
  }

  getLogs(limit = 50): LogEntry[] {
    return this.logEntries.slice(-limit)
  }

  getAllSatelliteBalances(): Record<ChainId, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {}
    for (const [chainId, satellite] of this.satellites) {
      result[chainId] = satellite.getAllWalletBalances(this.masterWallet.id)
    }
    return result as Record<ChainId, Record<string, number>>
  }
}
