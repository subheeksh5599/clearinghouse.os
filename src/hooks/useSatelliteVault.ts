import { useWriteContract, useReadContract, useWatchContractEvent } from "wagmi"
import { useAccount } from "wagmi"
import { parseUnits, type Address } from "viem"
import { SATELLITE_VAULT_ABI, DEPLOYED_ADDRESS } from "@/contracts/abi"
import { useEnvironment } from "@/hooks/useEnvironment"

export function useDeposit() {
  const { isLive } = useEnvironment()
  const { address: walletAddress } = useAccount()
  const { writeContract, data, error, isPending } = useWriteContract()

  const deposit = (amount: string, token: string) => {
    if (!isLive || !walletAddress) return
    const parsed = parseUnits(amount, 6)
    writeContract({
      address: DEPLOYED_ADDRESS,
      abi: SATELLITE_VAULT_ABI,
      functionName: "deposit",
      args: [walletAddress as Address, parsed, token],
      chainId: 11155111,
    })
  }

  return { deposit, txHash: data, error, isPending }
}

export function useAcquireStateLock() {
  const { isLive } = useEnvironment()
  const { address: walletAddress } = useAccount()
  const { writeContract, data, error, isPending } = useWriteContract()

  const acquire = (lockId: `0x${string}`, batchId: `0x${string}`) => {
    if (!isLive || !walletAddress) return
    writeContract({
      address: DEPLOYED_ADDRESS,
      abi: SATELLITE_VAULT_ABI,
      functionName: "acquireStateLock",
      args: [lockId, batchId, walletAddress as Address],
      chainId: 11155111,
    })
  }

  return { acquire, txHash: data, error, isPending }
}

export function useResolveStateLock() {
  const { isLive } = useEnvironment()
  const { writeContract, data, error, isPending } = useWriteContract()

  const resolve = (lockId: `0x${string}`) => {
    if (!isLive) return
    writeContract({
      address: DEPLOYED_ADDRESS,
      abi: SATELLITE_VAULT_ABI,
      functionName: "resolveStateLock",
      args: [lockId],
      chainId: 11155111,
    })
  }

  return { resolve, txHash: data, error, isPending }
}

export function useIsWalletLocked(wallet: string) {
  const { isLive } = useEnvironment()
  const { data } = useReadContract({
    address: DEPLOYED_ADDRESS,
    abi: SATELLITE_VAULT_ABI,
    functionName: "isWalletLocked",
    args: [wallet as Address],
    query: { enabled: isLive && !!wallet },
  })
  return isLive ? data : false
}

export function useWatchLocks() {
  const { isLive } = useEnvironment()

  useWatchContractEvent({
    address: DEPLOYED_ADDRESS,
    abi: SATELLITE_VAULT_ABI,
    eventName: "StateLockAcquired",
    enabled: isLive,
    onLogs(logs) {
      console.log("[Live] StateLockAcquired:", logs)
    },
  })

  useWatchContractEvent({
    address: DEPLOYED_ADDRESS,
    abi: SATELLITE_VAULT_ABI,
    eventName: "StateLockResolved",
    enabled: isLive,
    onLogs(logs) {
      console.log("[Live] StateLockResolved:", logs)
    },
  })
}
