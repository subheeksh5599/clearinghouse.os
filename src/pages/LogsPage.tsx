import { Link } from "react-router-dom"
import { useTreasurySocket } from "@/hooks/useTreasurySocket"
import VerifiabilityFooter from "@/components/VerifiabilityFooter"
import type { LogEntry } from "@/types"

export default function LogsPage() {
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
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Event Log</h1>
            <p className="text-xs text-muted-foreground mt-1">Real-time state-lock, batch, and execution events</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? "bg-primary" : "bg-destructive"}`} />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {connected ? "LIVE" : "OFFLINE"}
              </span>
            </div>
            <div className="flex gap-2">
              <a
                href="/api/audit/download?format=csv"
                download
                className="bg-muted/30 border border-border text-foreground px-3 py-1.5 text-[10px] rounded-sm cursor-pointer hover:border-muted-foreground/40 transition-all uppercase tracking-widest"
              >
                Export CSV
              </a>
              <a
                href="/api/audit/download?format=json"
                download
                className="bg-muted/30 border border-border text-foreground px-3 py-1.5 text-[10px] rounded-sm cursor-pointer hover:border-muted-foreground/40 transition-all uppercase tracking-widest"
              >
                Export JSON
              </a>
            </div>
          </div>
        </div>

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
          <div className="bg-muted/20 border border-border rounded-sm max-h-[70vh] overflow-y-auto">
            {state.logs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm text-muted-foreground">No events yet</p>
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  Deposit funds or trigger a rebalance from the Treasury page to generate events
                </p>
                <Link to="/treasury" className="inline-block mt-4 text-primary text-xs hover:underline">
                  Go to Treasury →
                </Link>
              </div>
            ) : (
              state.logs.map((entry: LogEntry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <span
                    className={`text-[10px] font-bold uppercase w-5 h-5 flex items-center justify-center rounded bg-muted shrink-0 mt-0.5 ${
                      entry.level === "info" ? "text-muted-foreground"
                        : entry.level === "warn" ? "text-amber-400"
                        : entry.level === "error" ? "text-destructive"
                        : "text-primary"
                    }`}
                  >
                    {entry.level === "info" ? "i" : entry.level === "warn" ? "w" : entry.level === "error" ? "x" : "✓"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground leading-tight">{entry.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-muted-foreground/50">
                        {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                      {entry.chainId && (
                        <span className="text-[8px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded font-medium">
                          {entry.chainId.toUpperCase()}
                        </span>
                      )}
                      {entry.batchId && (
                        <span className="text-[8px] text-muted-foreground/40 font-mono">
                          {entry.batchId.slice(0, 8)}
                        </span>
                      )}
                      {entry.category && (
                        <span className="text-[8px] text-muted-foreground/30 italic">
                          {entry.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <VerifiabilityFooter />
    </div>
  )
}
