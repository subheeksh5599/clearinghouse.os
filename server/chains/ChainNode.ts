import { CHAINS } from "../types.ts"
import type { ChainId, ChainConfig, ChainState } from "../types.ts"
import { EventEmitter } from "node:events"

export class ChainNode extends EventEmitter {
  config: ChainConfig
  state: ChainState
  private interval: ReturnType<typeof setInterval> | null = null
  private blockTimer: ReturnType<typeof setInterval> | null = null

  constructor(chainId: ChainId) {
    super()
    this.config = CHAINS[chainId]
    this.state = {
      chainId,
      currentBlock: 0,
      isOnline: true,
      pendingTransactions: 0,
      lastBlockTime: Date.now(),
    }
  }

  start(): void {
    this.blockTimer = setInterval(() => {
      this.state.currentBlock++
      this.state.lastBlockTime = Date.now()
      this.emit("block", this.state.chainId, this.state.currentBlock)
    }, this.config.blockTimeMs)
    console.log(`[${this.config.name}] Chain node started — block time ${this.config.blockTimeMs}ms`)
  }

  stop(): void {
    if (this.blockTimer) clearInterval(this.blockTimer)
    if (this.interval) clearInterval(this.interval)
  }

  async waitForBlocks(count: number): Promise<void> {
    const target = this.state.currentBlock + count
    return new Promise((resolve) => {
      const check = () => {
        if (this.state.currentBlock >= target) {
          this.off("block", check)
          resolve()
        }
      }
      this.on("block", check)
    })
  }

  getFinalityBlock(blockNumber: number): number {
    return blockNumber + this.config.finalityBlocks
  }
}
