export const SATELLITE_VAULT_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_masterContract", type: "address" },
      { name: "_signers", type: "address[5]" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "masterContract",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MULTISIG_THRESHOLD",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "LOCK_TIMEOUT",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "deposit",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "token", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "debit",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "token", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "acquireStateLock",
    inputs: [
      { name: "lockId", type: "bytes32" },
      { name: "batchId", type: "bytes32" },
      { name: "wallet", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolveStateLock",
    inputs: [{ name: "lockId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addEmergencyApproval",
    inputs: [{ name: "lockId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "triggerEmergencyUnlock",
    inputs: [{ name: "lockId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isWalletLocked",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLockStatus",
    inputs: [{ name: "lockId", type: "bytes32" }],
    outputs: [
      { name: "status", type: "uint8" },
      { name: "lockedAt", type: "uint256" },
      { name: "resolvedAt", type: "uint256" },
      { name: "timeoutExpired", type: "bool" },
      { name: "approvalCount", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBalance",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "token", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { indexed: true, name: "wallet", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "token", type: "string" },
    ],
  },
  {
    type: "event",
    name: "Debit",
    inputs: [
      { indexed: true, name: "wallet", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "token", type: "string" },
    ],
  },
  {
    type: "event",
    name: "StateLockAcquired",
    inputs: [
      { indexed: true, name: "lockId", type: "bytes32" },
      { indexed: true, name: "wallet", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "StateLockResolved",
    inputs: [
      { indexed: true, name: "lockId", type: "bytes32" },
      { indexed: true, name: "wallet", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "EmergencyUnlockExecuted",
    inputs: [
      { indexed: true, name: "lockId", type: "bytes32" },
      { indexed: true, name: "caller", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "MultiSigApprovalAdded",
    inputs: [
      { indexed: true, name: "lockId", type: "bytes32" },
      { indexed: true, name: "signer", type: "address" },
      { indexed: false, name: "approvals", type: "uint256" },
    ],
  },
] as const

export const DEPLOYED_ADDRESS = "0xD2E467F461cd8ffb57ba86fd37c3Dd99aF6D80B6" as const
