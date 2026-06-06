export type ChainId = "base" | "optimism" | "arbitrum"

export interface ChainConfig {
  id: ChainId
  name: string
  blockTimeMs: number
  finalityBlocks: number
  rpc: string
}

export interface CongestionState {
  chainId: ChainId
  isCongested: boolean
  extraLatencyMs: number
  reason: string
}

export const CHAINS: Record<ChainId, ChainConfig> = {
  base: {
    id: "base",
    name: "Base",
    blockTimeMs: 2000,
    finalityBlocks: 6,
    rpc: "https://mainnet.base.org",
  },
  optimism: {
    id: "optimism",
    name: "Optimism",
    blockTimeMs: 2000,
    finalityBlocks: 12,
    rpc: "https://mainnet.optimism.io",
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum",
    blockTimeMs: 250,
    finalityBlocks: 20,
    rpc: "https://arb1.arbitrum.io/rpc",
  },
}

export type LockStatus = "IDLE" | "PENDING" | "LOCKED" | "RESOLVED" | "EMERGENCY_UNLOCKED"

export const LOCK_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
export const MULTISIG_THRESHOLD = 3 // 3-of-5 required

export interface MultiSigApproval {
  lockId: string
  signer: string
  approvedAt: number
  signature: string
}

export interface StateLock {
  id: string
  batchId: string
  walletId: string
  chainId: ChainId
  status: LockStatus
  lockedAt: number | null
  resolvedAt: number | null

  // Emergency escape hatch fields
  emergencyTimeoutMs: number
  multiSigApprovals: MultiSigApproval[]
  emergencyUnlockedBy: string | null
  emergencyUnlockedAt: number | null
}

export type BatchStatus = "BUILDING" | "SUBMITTED" | "CONFIRMED" | "EXECUTED" | "FAILED"

export interface CrossChainOperation {
  chainId: ChainId
  type: "debit" | "credit"
  amount: number
  token: string
}

export interface Batch {
  id: string
  walletId: string
  operations: CrossChainOperation[]
  stateLocks: StateLock[]
  status: BatchStatus
  createdAt: number
  submittedAt: number | null
  confirmedAt: number | null
  executedAt: number | null
  error: string | null
}

export interface TreasuryWallet {
  id: string
  label: string
  balances: Record<ChainId, number>
  tokens: string[]
}

export interface ChainState {
  chainId: ChainId
  currentBlock: number
  isOnline: boolean
  pendingTransactions: number
  lastBlockTime: number
}

export interface LogEntry {
  id: string
  timestamp: number
  level: "info" | "warn" | "error" | "success"
  message: string
  batchId?: string
  chainId?: ChainId
  category?: "deposit" | "rebalance" | "state_lock" | "execution" | "emergency" | "system"
}

export interface AuditRecord {
  id: string
  timestamp: number
  isoDate: string
  category: string
  level: string
  chainId: string
  batchId: string
  amount: number | null
  token: string | null
  message: string
}

export interface GasSavingsEstimate {
  traditionalCostUsd: number
  clearinghouseCostUsd: number
  savingsUsd: number
  savingsPercent: number
  totalOperationsSaved: number
  totalGasHopsAvoided: number
}

export interface SystemState {
  masterWallet: TreasuryWallet
  chains: Record<ChainId, ChainState>
  activeBatches: Batch[]
  completedBatches: Batch[]
  logs: LogEntry[]
  totalRebalanced: number
  totalStateLocks: number
  uptimeSeconds: number
  congestion: Record<ChainId, CongestionState>
  gasSavings: GasSavingsEstimate
}
