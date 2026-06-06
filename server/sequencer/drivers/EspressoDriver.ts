import type { Batch, ChainId } from "../../types.ts"

// ── BLS Threshold Signature Mock ─────────────────────────────────
// Espresso HotShot consensus uses BLS12-381 threshold signatures.
// A supermajority (≥ 2/3 + 1) of validators must sign each batch
// for the sequencer to consider it finalized.

export interface BlsPublicKey {
  validatorIndex: number
  compressedKey: string
}

export interface EspressoBatchProof {
  batchHeaderRoot: string
  sequencerBlockHeight: number
  blsAggregateSignature: string
  signersBitmask: string
  totalValidators: number
  signedValidators: number
  quorumReached: boolean
}

const MOCK_VALIDATORS: BlsPublicKey[] = Array.from({ length: 100 }, (_, i) => ({
  validatorIndex: i,
  compressedKey: `0x${"ab".repeat(48)}${i.toString(16).padStart(2, "0")}`,
}))

const SUPERMAJORITY_THRESHOLD = Math.ceil((MOCK_VALIDATORS.length * 2) / 3) + 1

export function verifyBlsThresholdSignature(
  proof: EspressoBatchProof,
  validators: BlsPublicKey[],
): { valid: boolean; reason: string } {
  if (proof.signedValidators < SUPERMAJORITY_THRESHOLD) {
    return {
      valid: false,
      reason: `Insufficient validators: ${proof.signedValidators}/${SUPERMAJORITY_THRESHOLD} required`,
    }
  }

  if (proof.signedValidators > proof.totalValidators) {
    return { valid: false, reason: "Signed count exceeds total validators" }
  }

  if (!proof.blsAggregateSignature.startsWith("0x")) {
    return { valid: false, reason: "Invalid aggregate signature format" }
  }

  if (proof.batchHeaderRoot.length !== 66) {
    return { valid: false, reason: "Invalid batch header root length" }
  }

  if (!proof.quorumReached) {
    return { valid: false, reason: "Quorum flag is false" }
  }

  return { valid: true, reason: "BLS aggregate signature verified" }
}

export function generateMockProof(
  batchHeaderRoot: string,
  sequencerBlockHeight: number,
): EspressoBatchProof {
  const signedCount = 70 + Math.floor(Math.random() * 20)
  const bitmask = "0x" + "f".repeat(Math.ceil(signedCount / 4))

  return {
    batchHeaderRoot,
    sequencerBlockHeight,
    blsAggregateSignature: `0x${"cd".repeat(48)}${Date.now().toString(16)}`,
    signersBitmask: bitmask,
    totalValidators: MOCK_VALIDATORS.length,
    signedValidators: signedCount,
    quorumReached: signedCount >= SUPERMAJORITY_THRESHOLD,
  }
}

// ── Driver Interface ────────────────────────────────────────────

export interface ISharedSequencerDriver {
  readonly name: string
  readonly version: string

  submitBatch(batch: Batch): Promise<{ accepted: boolean; sequencerHeight: number }>

  pollFinalityGadget(
    sequencerHeight: number,
  ): Promise<{ finalized: boolean; proof: EspressoBatchProof | null }>

  verifyInclusionProof(
    batchHeaderRoot: string,
    proof: EspressoBatchProof,
  ): Promise<{ valid: boolean; reason: string }>

  getNetworkStatus(): Promise<{
    isHealthy: boolean
    currentHeight: number
    pendingBatches: number
    avgConfirmationMs: number
  }>
}

// ── Espresso HotShot Driver ─────────────────────────────────────

export class EspressoDriver implements ISharedSequencerDriver {
  readonly name = "Espresso HotShot"
  readonly version = "1.0.0"

  private sequencerHeight = 0
  private finalizedProofs: Map<number, EspressoBatchProof> = new Map()

  async submitBatch(
    batch: Batch,
  ): Promise<{ accepted: boolean; sequencerHeight: number }> {
    this.sequencerHeight++
    const delay = 300 + Math.random() * 400
    await new Promise((r) => setTimeout(r, delay))

    console.log(
      `[Espresso] Batch ${batch.id.slice(0, 8)} included at height ${this.sequencerHeight}`,
    )

    return { accepted: true, sequencerHeight: this.sequencerHeight }
  }

  async pollFinalityGadget(sequencerHeight: number): Promise<{
    finalized: boolean
    proof: EspressoBatchProof | null
  }> {
    const delay = 800 + Math.random() * 1200
    await new Promise((r) => setTimeout(r, delay))

    const proof = generateMockProof(
      `0x${sequencerHeight.toString(16).padStart(64, "0")}`,
      sequencerHeight,
    )

    this.finalizedProofs.set(sequencerHeight, proof)

    return { finalized: true, proof }
  }

  async verifyInclusionProof(
    batchHeaderRoot: string,
    proof: EspressoBatchProof,
  ): Promise<{ valid: boolean; reason: string }> {
    return verifyBlsThresholdSignature(proof, MOCK_VALIDATORS)
  }

  async getNetworkStatus(): Promise<{
    isHealthy: boolean
    currentHeight: number
    pendingBatches: number
    avgConfirmationMs: number
  }> {
    return {
      isHealthy: true,
      currentHeight: this.sequencerHeight,
      pendingBatches: 0,
      avgConfirmationMs: 1500,
    }
  }
}

// ── Driver Factory ──────────────────────────────────────────────

export type DriverName = "espresso"

export function createSequencerDriver(name: DriverName): ISharedSequencerDriver {
  switch (name) {
    case "espresso":
      return new EspressoDriver()
    default: {
      const _exhaustive: never = name
      throw new Error(`Unknown driver: ${_exhaustive}`)
    }
  }
}
