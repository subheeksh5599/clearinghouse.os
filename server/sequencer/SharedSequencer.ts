import { v4 as uuid } from "uuid"
import type { Batch, ChainId, CongestionState } from "../types.ts"
import { ChainRegistry } from "../chains/ChainRegistry.ts"
import type { MasterTreasuryContract } from "../contracts/MasterTreasuryContract.ts"
import { ISharedSequencerDriver } from "./drivers/EspressoDriver.ts"

interface SequencerBatchEntry {
  batch: Batch
  chainConfirmations: Map<ChainId, boolean>
  submittedAt: number
  batchBlockHeights: Map<ChainId, number>
}

export class SharedSequencer {
  private entries: Map<string, SequencerBatchEntry> = new Map()
  private master: MasterTreasuryContract | null = null
  private chains: ChainRegistry
  private batchIntervalMs: number

  // Production driver (swappable)
  private productionDriver: ISharedSequencerDriver | null = null

  // Chaos mode
  chaosEnabled = false
  private congestionState: Map<ChainId, CongestionState> = new Map()

  constructor(chains: ChainRegistry, batchIntervalMs = 5000) {
    this.chains = chains
    this.batchIntervalMs = batchIntervalMs
    this.resetCongestion()
  }

  resetCongestion(): void {
    for (const chainId of ["base", "optimism", "arbitrum"] as ChainId[]) {
      this.congestionState.set(chainId, {
        chainId,
        isCongested: false,
        extraLatencyMs: 0,
        reason: "",
      })
    }
  }

  getCongestionSnapshot(): Record<ChainId, CongestionState> {
    const snap: Record<string, CongestionState> = {}
    for (const [k, v] of this.congestionState) {
      snap[k] = { ...v }
    }
    return snap as Record<ChainId, CongestionState>
  }

  simulateCongestion(
    chainId: ChainId,
    extraLatencyMs: number,
    reason: string,
  ): void {
    const state = this.congestionState.get(chainId)
    if (!state) return
    state.isCongested = true
    state.extraLatencyMs = extraLatencyMs
    state.reason = reason
    console.log(`[Chaos] ${chainId.toUpperCase()} congested: +${extraLatencyMs}ms — ${reason}`)
  }

  clearCongestion(chainId: ChainId): void {
    const state = this.congestionState.get(chainId)
    if (!state) return
    state.isCongested = false
    state.extraLatencyMs = 0
    state.reason = ""
    console.log(`[Chaos] ${chainId.toUpperCase()} congestion cleared`)
  }

  // Production driver integration
  setProductionDriver(driver: ISharedSequencerDriver): void {
    this.productionDriver = driver
    console.log(`[Sequencer] Production driver set: ${driver.name} v${driver.version}`)
  }

  setMaster(master: MasterTreasuryContract): void {
    this.master = master
  }

  async submitBatch(batch: Batch): Promise<Batch> {
    const involvedChains = [...new Set(batch.stateLocks.map((lock) => lock.chainId))]

    const batchBlockHeights = new Map<ChainId, number>()
    for (const chainId of involvedChains) {
      const node = this.chains.getNode(chainId)
      batchBlockHeights.set(chainId, node.state.currentBlock)
    }

    // ── Production path: route through real sequencer driver ──
    if (this.productionDriver) {
      const result = await this.productionDriver.submitBatch(batch)
      if (!result.accepted) {
        if (this.master) {
          this.master.onBatchRejected(batch, "Production sequencer rejected batch")
        }
        return batch
      }
      console.log(`[Sequencer] Production driver accepted batch at height ${result.sequencerHeight}`)
    }

    const confirmationMap = new Map<ChainId, boolean>()
    for (const chainId of involvedChains) {
      confirmationMap.set(chainId, false)
    }

    const entry: SequencerBatchEntry = {
      batch,
      chainConfirmations: confirmationMap,
      submittedAt: Date.now(),
      batchBlockHeights,
    }

    this.entries.set(batch.id, entry)
    batch.status = "SUBMITTED"
    batch.submittedAt = Date.now()

    console.log(`[Sequencer] Batch ${batch.id.slice(0, 8)} submitted — waiting for ${involvedChains.length} chain confirmations`)

    for (const chainId of involvedChains) {
      this.waitForChainInclusion(batch.id, chainId)
    }

    return { ...batch }
  }

  private async waitForChainInclusion(batchId: string, chainId: ChainId): Promise<void> {
    const entry = this.entries.get(batchId)
    if (!entry) return

    const node = this.chains.getNode(chainId)
    const targetBlock = node.getFinalityBlock(
      entry.batchBlockHeights.get(chainId) ?? node.state.currentBlock,
    )

    // ── Chaos mode: inject extra latency ──
    const congestion = this.congestionState.get(chainId)
    if (this.chaosEnabled && congestion?.isCongested) {
      console.log(`[Chaos] ${chainId.toUpperCase()} delaying confirmation by ${congestion.extraLatencyMs}ms`)
      await new Promise((r) => setTimeout(r, congestion.extraLatencyMs))
    }

    console.log(`[Sequencer] Waiting for ${chainId.toUpperCase()} block ${targetBlock} (current: ${node.state.currentBlock})`)

    await node.waitForBlocks(targetBlock - node.state.currentBlock + 1)

    entry.chainConfirmations.set(chainId, true)
    console.log(`[Sequencer] ✓ ${chainId.toUpperCase()} included in batch @ block ${node.state.currentBlock}`)

    this.checkAllConfirmations(batchId)
  }

  private checkAllConfirmations(batchId: string): void {
    const entry = this.entries.get(batchId)
    if (!entry) return

    const allConfirmed = [...entry.chainConfirmations.values()].every((v) => v)
    if (!allConfirmed) return

    console.log(`[Sequencer] All chains confirmed for batch ${batchId.slice(0, 8)} — firing deterministic trigger`)

    entry.batch.status = "CONFIRMED"
    entry.batch.confirmedAt = Date.now()

    setTimeout(() => {
      this.entries.delete(batchId)
      if (this.master) {
        this.master.onBatchConfirmed(entry.batch)
      }
    }, this.batchIntervalMs)
  }

  getPendingBatches(): Batch[] {
    return Array.from(this.entries.values()).map((e) => e.batch)
  }
}
