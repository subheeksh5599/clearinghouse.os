import { useWallet } from "@/hooks/useWallet"

const CHAIN_LABELS: Record<string, string> = {
  "0xaa36a7": "Sepolia",
  "0x14a34": "Base Sepolia",
  "0xaa37dc": "OP Sepolia",
  "0x66eee": "Arb Sepolia",
}

export default function NavWalletButton() {
  const { account, chainId, connect, disconnect, loading, error, dismissError } = useWallet()

  if (error) {
    return (
      <button
        type="button"
        onClick={() => { dismissError(); connect() }}
        className="text-xs text-amber-400 hover:text-foreground transition-colors uppercase tracking-widest cursor-pointer"
      >
        {error} — Retry
      </button>
    )
  }

  if (account) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">
          {CHAIN_LABELS[chainId ?? ""] ?? chainId}
        </span>
        <span className="text-xs text-primary font-mono tracking-widest">
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
        <button
          type="button"
          onClick={disconnect}
          className="text-[9px] text-muted-foreground hover:text-destructive transition-colors uppercase tracking-widest cursor-pointer"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={loading}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest cursor-pointer"
    >
      {loading ? "Connecting..." : "Connect Wallet"}
    </button>
  )
}
