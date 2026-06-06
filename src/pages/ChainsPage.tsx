import { Link } from "react-router-dom"
import { useTreasurySocket } from "@/hooks/useTreasurySocket"
import VerifiabilityFooter from "@/components/VerifiabilityFooter"
import type { ChainId, ChainState, CongestionState } from "@/types"

const CHAIN_LABELS: Record<ChainId, { name: string; color: string }> = {
  base: { name: "Base", color: "#0052FF" },
  optimism: { name: "OP Mainnet", color: "#FF0420" },
  arbitrum: { name: "Arbitrum", color: "#28A0F0" },
}

const BLOCK_TIMES: Record<ChainId, number> = { base: 2000, optimism: 2000, arbitrum: 250 }
const FINALITY: Record<ChainId, number> = { base: 6, optimism: 12, arbitrum: 20 }

function ChainCard({
  chain,
  id,
  congestion,
}: {
  chain: ChainState
  id: ChainId
  congestion: CongestionState
}) {
  const cfg = CHAIN_LABELS[id]
  return (
    <div className={`bg-muted/50 border rounded-sm p-5 ${congestion.isCongested ? "border-amber-400/40" : "border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: chain.isOnline ? cfg.color : "#555" }}
          />
          <span className="text-base font-semibold text-foreground">{cfg.name}</span>
        </div>
        {congestion.isCongested && (
          <span className="text-[9px] uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded font-bold">
            CONGESTED
          </span>
        )}
      </div>

      {congestion.isCongested && (
        <div className="bg-amber-400/5 border border-amber-400/20 rounded-sm px-3 py-2 mb-3">
          <p className="text-[10px] text-amber-400 font-medium">{congestion.reason}</p>
          <p className="text-[9px] text-amber-400/60 mt-0.5">+{congestion.extraLatencyMs}ms added latency</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-[10px]">
        <div>
          <div className="uppercase tracking-widest text-muted-foreground/60 mb-1">
            Blocks
          </div>
          <div className="font-mono text-foreground text-sm">
            {chain.currentBlock.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="uppercase tracking-widest text-muted-foreground/60 mb-1">Block Time</div>
          <div className="font-mono text-foreground text-sm">
            {BLOCK_TIMES[id]}ms{congestion.isCongested ? <span className="text-amber-400 ml-1">+{congestion.extraLatencyMs}ms</span> : null}
          </div>
        </div>
        <div>
          <div className="uppercase tracking-widest text-muted-foreground/60 mb-1">Finality</div>
          <div className="font-mono text-foreground text-sm">
            {FINALITY[id]} blocks (~{((FINALITY[id] * BLOCK_TIMES[id]) / 1000).toFixed(1)}s)
          </div>
        </div>
        <div>
          <div className="uppercase tracking-widest text-muted-foreground/60 mb-1">Status</div>
          <div className={`font-semibold text-sm ${chain.isOnline ? "text-primary" : "text-destructive"}`}>
            {chain.isOnline ? "ONLINE" : "OFFLINE"}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChainsPage() {
  const { state, connected } = useTreasurySocket()

  return (
    <div className="bg-hero-bg min-h-screen font-sora">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-5 bg-hero-bg/80 backdrop-blur-sm">
        <Link to="/" className="text-foreground text-xl font-semibold tracking-tight">
          CLEARINGHOUSE<span className="text-primary">.OS</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "Chains", to: "/chains" },
            { label: "Treasury", to: "/treasury" },
            { label: "Logs", to: "/logs" },
          ].map((l) => (
            <Link key={l.label} to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">
              {l.label}
            </Link>
          ))}
        </div>
        <Link to="/" className="hidden md:inline-flex items-center justify-center text-foreground bg-nav-button hover:bg-nav-button/80 active:scale-[0.97] transition-all rounded-lg uppercase text-xs tracking-widest px-6 h-10">
          Back Home
        </Link>
      </nav>

      <div className="px-8 lg:px-16 pt-28 pb-16 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Chain Nodes</h1>
            <p className="text-xs text-muted-foreground mt-1">Independent L2 simulators with real block times</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? "bg-primary" : "bg-destructive"}`} />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {connected ? "LIVE" : "OFFLINE"}
              </span>
            </div>
          </div>
        </div>

        {/* Chaos Mode Controls */}
        {state && (
          <div className="bg-muted/30 border border-border rounded-sm p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                Chaos Mode
              </h3>
              <button
                type="button"
                className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-sm font-bold transition-all ${
                  state.congestion ? "bg-destructive/10 text-destructive border border-destructive/30" : "bg-muted/20 text-muted-foreground border border-border"
                }`}
                onClick={() => {
                  fetch("/api/chaos/toggle", { method: "POST" })
                }}
              >
                {state.congestion ? "CHAOS ACTIVE" : "Enable Chaos"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Inject artificial latency to test system resilience. Active batches will hold their state locks while congested chains delay confirmation.
            </p>
            {state.congestion && (
              <div className="flex flex-wrap gap-2">
                {(Object.keys(state.congestion) as ChainId[]).map((id) => {
                  const c = state.congestion[id]
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-sm font-medium cursor-pointer transition-all ${
                        c.isCongested
                          ? "bg-amber-400/10 text-amber-400 border border-amber-400/30"
                          : "bg-muted/20 text-muted-foreground border border-border hover:border-muted-foreground/40"
                      }`}
                      onClick={() => {
                        if (c.isCongested) {
                          fetch("/api/chaos/clear", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ chainId: id }),
                          })
                        } else {
                          const latency = { base: 10000, optimism: 12000, arbitrum: 5000 }[id]
                          const reason = { base: "Base sequencer stall", optimism: "OP batcher congestion", arbitrum: "Arbitrum sequencer downtime" }[id]
                          fetch("/api/chaos/congest", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ chainId: id, extraLatencyMs: latency, reason }),
                          })
                        }
                      }}
                    >
                      {CHAIN_LABELS[id].name}: {c.isCongested ? "CLEAR" : "CONGEST"}
                    </button>
                  )
                })}
                <button
                  type="button"
                  className="text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-sm font-medium bg-muted/20 text-muted-foreground border border-border cursor-pointer hover:border-muted-foreground/40"
                  onClick={() => {
                    fetch("/api/chaos/clear", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({}),
                    })
                  }}
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        )}

        {!state ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm mb-2">
              {connected ? "Loading..." : "Backend engine offline"}
            </p>
            {!connected && (
              <code className="text-[11px] text-muted-foreground/60 bg-muted/30 px-3 py-1.5 rounded">
                cd clearinghouse-os && npm run dev:server
              </code>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(Object.keys(state.chains) as ChainId[]).map((id) => (
                <ChainCard
                  key={id}
                  chain={state.chains[id]}
                  id={id}
                  congestion={state.congestion[id]}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-8 text-center uppercase tracking-widest">
              Each chain runs independently — differing block times prevent real-time aggregation without shared sequencing
            </p>
          </>
        )}
      </div>
      <VerifiabilityFooter />
    </div>
  )
}
