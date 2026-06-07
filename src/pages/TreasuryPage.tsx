import { useState } from "react"
import { Link } from "react-router-dom"
import { useTreasurySocket } from "@/hooks/useTreasurySocket"
import { apiPost } from "@/lib/api"
import { useEnvironment } from "@/hooks/useEnvironment"
import { useDeposit } from "@/hooks/useSatelliteVault"
import EnvironmentToggle from "@/components/EnvironmentToggle"
import NavWalletButton from "@/components/NavWalletButton"
import VerifiabilityFooter from "@/components/VerifiabilityFooter"
import type { ChainId, Batch } from "@/types"

const CHAIN_LABELS: Record<ChainId, { name: string; color: string }> = {
  base: { name: "Base", color: "#0052FF" },
  optimism: { name: "OP Mainnet", color: "#FF0420" },
  arbitrum: { name: "Arbitrum", color: "#28A0F0" },
}

function formatUsd(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

function BatchStatusBadge({ status }: { status: Batch["status"] }) {
  const colors: Record<Batch["status"], string> = {
    BUILDING: "text-muted-foreground bg-muted",
    SUBMITTED: "text-amber-400 bg-amber-400/10",
    CONFIRMED: "text-sky-400 bg-sky-400/10",
    EXECUTED: "text-primary bg-primary/10",
    FAILED: "text-destructive bg-destructive/10",
  }
  return (
    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded font-medium ${colors[status]}`}>
      {status}
    </span>
  )
}

function DepositPanel() {
  const [showLocal, setShowLocal] = useState(false)
  const [showOnchain, setShowOnchain] = useState(false)
  const [amount, setAmount] = useState("100000")
  const [chain, setChain] = useState("base")
  const [onchainAmount, setOnchainAmount] = useState("100000000")
  const [status, setStatus] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const handleLocal = () => {
    const amt = parseInt(amount)
    if (!amt || amt <= 0) { setStatus("Invalid amount"); return }
    apiPost("/api/rebalance", {
      customOperations: [
        { type: "credit", chainId: chain, amount: amt, token: "USDC" },
      ],
    })
    setStatus(`Deposited ${amt} USDC on ${chain.toUpperCase()}`)
    setShowLocal(false)
    setTimeout(() => setStatus(null), 3000)
  }

  const handleOnchain = async () => {
    const ethereum = (window as any).ethereum
    if (!ethereum) { setStatus("No wallet detected"); return }
    const accounts = await ethereum.request({ method: "eth_accounts" })
    if (!accounts.length) { setStatus("Connect wallet first"); return }
    const amt = parseInt(onchainAmount)
    if (!amt || amt <= 0) { setStatus("Invalid amount"); return }

    const contract = "0xD2E467F461cd8ffb57ba86fd37c3Dd99aF6D80B6"
    const data = "0x" +
      "b7b0424f" +
      accounts[0].slice(2).padStart(64, "0") +
      amt.toString(16).padStart(64, "0") +
      "0000000000000000000000000000000000000000000000000000000000000060" +
      "0000000000000000000000000000000000000000000000000000000000000004" +
      "5553444300000000000000000000000000000000000000000000000000000000"
    try {
      setStatus("Confirm in wallet...")
      const tx = await ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: accounts[0], to: contract, data }],
      })
      setTxHash(tx)
      setStatus("Sent!")
      setShowOnchain(false)
    } catch (e: any) {
      setStatus(e?.message?.slice(0, 80) ?? "Transaction failed")
    }
  }

  if (status && !showLocal && !showOnchain) {
    return (
      <div className={`bg-muted/30 border rounded-sm p-3 ${txHash ? "border-primary/30" : "border-border"}`}>
        <p className="text-[11px] text-foreground">{status}</p>
        {txHash && (
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline mt-1 inline-block">
            View on Etherscan ↗
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { setShowLocal(!showLocal); setShowOnchain(false); setStatus(null) }} className="bg-hero-bg border border-border text-foreground px-4 py-2 text-xs rounded-sm cursor-pointer hover:border-muted-foreground/40 transition-all uppercase tracking-widest">
          {showLocal ? "✕ Cancel" : "Local Deposit"}
        </button>
        <button type="button" onClick={() => { setShowOnchain(!showOnchain); setShowLocal(false); setStatus(null) }} className="bg-white text-background px-4 py-2 text-xs rounded-sm cursor-pointer hover:brightness-90 transition-all uppercase tracking-widest font-bold">
          {showOnchain ? "✕ Cancel" : "On-Chain Deposit"}
        </button>
      </div>

      {showLocal && (
        <div className="bg-hero-bg border border-border rounded-sm p-4 space-y-3">
          <div>
            <label className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1 block">Amount (USDC)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-muted/30 border border-border rounded-sm px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary/50" placeholder="100000" />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1 block">Chain</label>
            <select value={chain} onChange={(e) => setChain(e.target.value)} className="w-full bg-muted/30 border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 cursor-pointer">
              <option value="base">Base</option>
              <option value="optimism">Optimism</option>
              <option value="arbitrum">Arbitrum</option>
            </select>
          </div>
          <button type="button" onClick={handleLocal} className="bg-primary text-primary-foreground px-4 py-2 text-xs rounded-sm cursor-pointer hover:brightness-110 transition-all uppercase tracking-widest font-bold w-full">
            Submit Deposit
          </button>
        </div>
      )}

      {showOnchain && (
        <div className="bg-hero-bg border border-border rounded-sm p-4 space-y-3">
          <p className="text-[10px] text-muted-foreground/60">Sends a real transaction to SatelliteVault on Sepolia. Requires connected wallet + ETH for gas.</p>
          <div>
            <label className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1 block">Amount (USDC raw, 6 decimals)</label>
            <input type="number" value={onchainAmount} onChange={(e) => setOnchainAmount(e.target.value)} className="w-full bg-muted/30 border border-border rounded-sm px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary/50" placeholder="100000000" />
          </div>
          {status && <p className="text-[10px] text-amber-400">{status}</p>}
          <button type="button" onClick={handleOnchain} className="bg-white text-background px-4 py-2 text-xs rounded-sm cursor-pointer hover:brightness-90 transition-all uppercase tracking-widest font-bold w-full">
            Sign & Send Transaction
          </button>
        </div>
      )}
    </div>
  )
}

export default function TreasuryPage() {
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
          <NavWalletButton />
        </div>
        <Link to="/" className="hidden md:inline-flex items-center justify-center text-foreground bg-nav-button hover:bg-nav-button/80 active:scale-[0.97] transition-all rounded-lg uppercase text-xs tracking-widest px-6 h-10">
          Back Home
        </Link>
      </nav>

      <div className="px-8 lg:px-16 pt-28 pb-16 max-w-5xl mx-auto">
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Treasury</h1>
                <p className="text-xs text-muted-foreground mt-1">Live master treasury contract</p>
              </div>
              <div className="flex items-center gap-4 text-right">
                <EnvironmentToggle />
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Uptime</div>
                  <div className="text-xs font-mono text-foreground">
                    {state.uptimeSeconds < 60 ? `${state.uptimeSeconds}s` : `${Math.floor(state.uptimeSeconds / 60)}m`}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${connected ? "bg-primary" : "bg-destructive"}`} />
              </div>
            </div>

            {/* Gas & Slippage Saved Counter */}
            <div className="bg-muted/30 border border-primary/20 rounded-sm p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] uppercase tracking-widest text-primary/80">
                  Gas & Slippage Saved
                </h3>
                <span className="text-[9px] text-muted-foreground">
                  vs traditional async bridging
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">Total Saved</div>
                  <div className="text-2xl font-bold text-primary font-mono">{formatUsd(state.gasSavings.savingsUsd)}</div>
                  <div className="text-[10px] text-primary/60 mt-0.5">{state.gasSavings.savingsPercent}% cheaper</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">Traditional Cost</div>
                  <div className="text-xl font-bold text-destructive font-mono">{formatUsd(state.gasSavings.traditionalCostUsd)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">Our Cost</div>
                  <div className="text-xl font-bold text-primary font-mono">{formatUsd(state.gasSavings.clearinghouseCostUsd)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">Gas Hops Avoided</div>
                  <div className="text-xl font-bold text-foreground font-mono">{state.gasSavings.totalGasHopsAvoided}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {state.gasSavings.totalOperationsSaved} operations
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2 bg-hero-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${state.gasSavings.savingsPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-muted/30 border border-border rounded-sm p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">Total Balance</div>
                <div className="text-xl font-bold text-foreground font-mono">{formatUsd((Object.values(state.masterWallet.balances) as number[]).reduce((a, b) => a + b, 0))}</div>
              </div>
              <div className="bg-muted/30 border border-border rounded-sm p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">Rebalanced</div>
                <div className="text-xl font-bold text-primary font-mono">{formatUsd(state.totalRebalanced)}</div>
              </div>
              <div className="bg-muted/30 border border-border rounded-sm p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">State Locks</div>
                <div className="text-xl font-bold text-foreground font-mono">{state.totalStateLocks}</div>
              </div>
              <div className="bg-muted/30 border border-border rounded-sm p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">Active Batches</div>
                <div className="text-xl font-bold text-foreground font-mono">{state.activeBatches.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {(Object.keys(state.chains) as ChainId[]).map((id) => {
                const balance = state.masterWallet.balances[id] ?? 0
                const total = (Object.values(state.masterWallet.balances) as number[]).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? ((balance / total) * 100).toFixed(1) : "0"
                const cf = CHAIN_LABELS[id]
                return (
                  <div key={id} className="flex items-center justify-between bg-muted/30 border border-border rounded-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cf.color }} />
                      <span className="text-xs font-medium text-foreground">{cf.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-foreground">{formatUsd(balance)}</div>
                      <div className="text-[10px] text-muted-foreground">{pct}%</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {state.activeBatches.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-3">
                  Active Batches ({state.activeBatches.length})
                </h3>
                {state.activeBatches.map((batch) => (
                  <div key={batch.id} className="bg-muted/30 border border-border rounded-sm p-4 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono text-foreground">{batch.id.slice(0, 12)}...</span>
                      <BatchStatusBadge status={batch.status} />
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {batch.stateLocks.map((lock) => (
                        <span
                          key={lock.id}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            lock.status === "LOCKED" ? "bg-amber-400/10 text-amber-400"
                              : lock.status === "RESOLVED" ? "bg-primary/10 text-primary"
                              : lock.status === "EMERGENCY_UNLOCKED" ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {lock.chainId.toUpperCase()}:{lock.status}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {state.completedBatches.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-3">
                  Completed ({state.completedBatches.length})
                </h3>
                <div className="space-y-1">
                  {state.completedBatches.slice(-10).reverse().map((batch) => (
                    <div key={batch.id} className="flex items-center justify-between bg-muted/20 px-3 py-2 rounded-sm">
                      <span className="text-[10px] font-mono text-foreground">{batch.id.slice(0, 12)}...</span>
                      <BatchStatusBadge status={batch.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-muted/30 border border-border rounded-sm p-6">
              <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-4">
                Rebalance Controls
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Deposit funds into the treasury, then trigger cross-chain rebalancing through the shared sequencer.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: "balanced", label: "Balanced (33/33/34)" },
                  { key: "arbWeight", label: "Arbitrum Weighted (50%)" },
                  { key: "baseHeavy", label: "Base Heavy (50%)" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className="bg-hero-bg border border-border text-foreground px-5 py-2.5 text-xs rounded-sm cursor-pointer hover:border-muted-foreground/40 hover:bg-muted/50 transition-all active:scale-[0.97] uppercase tracking-widest"
                    onClick={() => {
                      apiPost("/api/rebalance", { strategy: key })
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className="bg-primary text-primary-foreground px-5 py-2.5 text-xs rounded-sm cursor-pointer hover:brightness-110 transition-all active:scale-[0.97] uppercase tracking-widest font-bold"
                  onClick={() => {
                    const deposit = prompt("Deposit amount (USDC):", "100000")
                    const chain = prompt("Chain (base/optimism/arbitrum):", "base")
                    if (deposit && chain) {
                      apiPost("/api/rebalance", {
                        customOperations: [
                          { type: "credit", chainId: chain, amount: parseInt(deposit), token: "USDC" },
                        ],
                      })
                    }
                  }}
                >
                  Local Deposit
                </button>

                <button
                  type="button"
                  className="bg-white text-background px-5 py-2.5 text-xs rounded-sm cursor-pointer hover:brightness-90 transition-all active:scale-[0.97] uppercase tracking-widest font-bold"
                  onClick={async () => {
                    const ethereum = (window as any).ethereum
                    if (!ethereum) { alert("No wallet connected"); return }
                    const accounts = await ethereum.request({ method: "eth_accounts" })
                    if (!accounts.length) { alert("Connect wallet first"); return }
                    const amount = prompt("USDC amount (6 decimals):", "100000000")
                    if (!amount) return
                    const contract = "0xD2E467F461cd8ffb57ba86fd37c3Dd99aF6D80B6"
                    const data = "0x" +
                      "b7b0424f" + // deposit selector
                      accounts[0].slice(2).padStart(64, "0") + // wallet
                      parseInt(amount).toString(16).padStart(64, "0") + // amount
                      "0000000000000000000000000000000000000000000000000000000000000060" + // string offset
                      "0000000000000000000000000000000000000000000000000000000000000004" + // string length
                      "5553444300000000000000000000000000000000000000000000000000000000" // "USDC" padded
                    try {
                      const tx = await ethereum.request({
                        method: "eth_sendTransaction",
                        params: [{ from: accounts[0], to: contract, data }],
                      })
                      alert(`Sent! Tx: ${tx.slice(0,20)}...`)
                      window.open(`https://sepolia.etherscan.io/tx/${tx}`, "_blank")
                    } catch (e: any) {
                      alert(e?.message ?? "Transaction failed")
                    }
                  }}
                >
                  On-Chain Deposit
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <VerifiabilityFooter />
    </div>
  )
}
