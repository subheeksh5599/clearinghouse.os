import { ChainNode } from "./ChainNode.ts"
import type { ChainId, ChainState } from "../types.ts"

export class ChainRegistry {
  nodes: Map<ChainId, ChainNode> = new Map()

  constructor() {
    this.nodes.set("base", new ChainNode("base"))
    this.nodes.set("optimism", new ChainNode("optimism"))
    this.nodes.set("arbitrum", new ChainNode("arbitrum"))
  }

  startAll(): void {
    for (const node of this.nodes.values()) node.start()
    console.log("All chain nodes started")
  }

  stopAll(): void {
    for (const node of this.nodes.values()) node.stop()
  }

  getNode(chainId: ChainId): ChainNode {
    const node = this.nodes.get(chainId)
    if (!node) throw new Error(`Chain ${chainId} not found`)
    return node
  }

  getAllStates(): Record<ChainId, ChainState> {
    const states: Record<string, ChainState> = {}
    for (const [id, node] of this.nodes) {
      states[id] = { ...node.state }
    }
    return states as Record<ChainId, ChainState>
  }
}
