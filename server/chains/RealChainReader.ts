import type { ChainId, ChainState } from "./types.ts"

/**
 * Live block reader — fetches real block numbers from a Base Sepolia RPC.
 * Falls back to local simulation if the RPC is unreachable.
 */
export async function fetchRealBlock(chainId: ChainId): Promise<{ block: number; timestamp: number }> {
  const rpcs: Record<string, string> = {
    base: "https://sepolia.base.org",
    optimism: "https://sepolia.optimism.io",
    arbitrum: "https://sepolia-rollup.arbitrum.io/rpc",
  }

  const url = rpcs[chainId]
  if (!url) return { block: 0, timestamp: Date.now() }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) throw new Error(`RPC returned ${res.status}`)

    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    const blockHex = data.result as string
    const block = parseInt(blockHex, 16)

    return { block, timestamp: Date.now() }
  } catch {
    // RPC unreachable — fall through to local simulation
    return { block: -1, timestamp: Date.now() }
  }
}

/**
 * Real-chain node that reads actual Base Sepolia blocks at interval,
 * falling back to simulated blocks if the RPC is offline.
 */
export class RealChainReader {
  chainId: ChainId
  currentBlock: number
  isOnline: boolean
  lastBlockTime: number
  private interval: ReturnType<typeof setInterval> | null = null
  private onBlockCallback: ((chainId: ChainId, block: number) => void) | null = null
  private simulationBlock = 0
  private useSimulation = false

  constructor(chainId: ChainId) {
    this.chainId = chainId
    this.currentBlock = 0
    this.isOnline = true
    this.lastBlockTime = Date.now()
  }

  onBlock(cb: (chainId: ChainId, block: number) => void): void {
    this.onBlockCallback = cb
  }

  async start(): Promise<void> {
    // Try a real RPC read first
    const initial = await fetchRealBlock(this.chainId)
    if (initial.block > 0) {
      this.currentBlock = initial.block
      this.lastBlockTime = initial.timestamp
      this.useSimulation = false
      console.log(`[${this.chainId.toUpperCase()}] Connected to live RPC — block ${this.currentBlock}`)
    } else {
      this.useSimulation = true
      console.log(`[${this.chainId.toUpperCase()}] RPC unreachable — using local simulation`)
    }

    this.interval = setInterval(async () => {
      if (this.useSimulation) {
        this.simulationBlock++
        this.currentBlock = this.simulationBlock
        this.lastBlockTime = Date.now()
      } else {
        const result = await fetchRealBlock(this.chainId)
        if (result.block > 0) {
          this.currentBlock = result.block
          this.lastBlockTime = result.timestamp
        }
        // If RPC fails during live mode, keep last known block
      }

      this.isOnline = true
      this.onBlockCallback?.(this.chainId, this.currentBlock)
    }, 2000) // poll every 2s for live mode
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval)
  }

  getSnapshot(): ChainState {
    return {
      chainId: this.chainId,
      currentBlock: this.currentBlock,
      isOnline: this.isOnline,
      pendingTransactions: 0,
      lastBlockTime: this.lastBlockTime,
    }
  }
}
