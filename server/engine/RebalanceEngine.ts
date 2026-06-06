import type { ChainId, CrossChainOperation } from "../types.ts"
import type { MasterTreasuryContract } from "../contracts/MasterTreasuryContract.ts"

export interface RebalanceStrategy {
  name: string
  targetAllocation: Record<ChainId, number>
  tolerance: number
}

const STRATEGIES: Record<string, RebalanceStrategy> = {
  balanced: {
    name: "Balanced",
    targetAllocation: { base: 0.33, optimism: 0.33, arbitrum: 0.34 },
    tolerance: 0.05,
  },
  arbWeight: {
    name: "Arbitrum-Weighted",
    targetAllocation: { base: 0.25, optimism: 0.25, arbitrum: 0.50 },
    tolerance: 0.05,
  },
  baseHeavy: {
    name: "Base-Heavy",
    targetAllocation: { base: 0.50, optimism: 0.25, arbitrum: 0.25 },
    tolerance: 0.05,
  },
}

export class RebalanceEngine {
  private master: MasterTreasuryContract

  constructor(master: MasterTreasuryContract) {
    this.master = master
  }

  computeRequiredMoves(strategy = "balanced"): CrossChainOperation[] {
    const strat = STRATEGIES[strategy] ?? STRATEGIES.balanced
    const balances = this.master.masterWallet.balances
    const chains = Object.keys(balances) as ChainId[]

    let totalBalance = 0
    for (const chainId of chains) {
      totalBalance += balances[chainId]
    }

    if (totalBalance === 0) return []

    const operations: CrossChainOperation[] = []
    const deficits: { chainId: ChainId; deficit: number }[] = []
    const surpluses: { chainId: ChainId; surplus: number }[] = []

    for (const chainId of chains) {
      const current = balances[chainId]
      const targetRatio = strat.targetAllocation[chainId]
      const target = totalBalance * targetRatio
      const delta = current - target

      if (delta > totalBalance * strat.tolerance) {
        surpluses.push({ chainId, surplus: delta })
      } else if (delta < -totalBalance * strat.tolerance) {
        deficits.push({ chainId, deficit: -delta })
      }
    }

    if (surpluses.length === 0 && deficits.length === 0) {
      return []
    }

    for (const surplus of surpluses) {
      let remaining = surplus.surplus

      for (const deficit of deficits) {
        if (remaining <= 0) break

        const moveAmount = Math.min(remaining, deficit.deficit)
        const token = this.master.masterWallet.tokens[0]

        operations.push({
          type: "debit",
          chainId: surplus.chainId,
          amount: Math.floor(moveAmount),
          token,
        })

        operations.push({
          type: "credit",
          chainId: deficit.chainId,
          amount: Math.floor(moveAmount),
          token,
        })

        remaining -= moveAmount
        deficit.deficit -= moveAmount
      }
    }

    return operations
  }

  async executeStrategy(strategy: string): Promise<{ successful: boolean; operations: number }> {
    const moves = this.computeRequiredMoves(strategy)
    if (moves.length === 0) {
      return { successful: true, operations: 0 }
    }

    await this.master.initiateRebalance(moves)
    return { successful: true, operations: moves.length }
  }

  getStrategies(): RebalanceStrategy[] {
    return Object.values(STRATEGIES)
  }
}
