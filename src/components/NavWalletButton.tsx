import { useState, type ReactNode } from "react"

export default function NavWalletButton() {
  const [walletUi, setWalletUi] = useState<ReactNode>(null)
  const [loading, setLoading] = useState(false)

  const enable = async () => {
    setLoading(true)
    try {
      const [{ WagmiProvider }, { QueryClient, QueryClientProvider }, { RainbowKitProvider, ConnectButton }, { wagmiConfig }] = await Promise.all([
        import("wagmi"),
        import("@tanstack/react-query"),
        import("@rainbow-me/rainbowkit"),
        import("@/lib/wagmi"),
      ])
      const qc = new QueryClient()
      setWalletUi(
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={qc}>
            <RainbowKitProvider>
              <ConnectButton />
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>,
      )
    } catch {
      setLoading(false)
    }
  }

  if (walletUi) return <>{walletUi}</>

  return (
    <button
      type="button"
      onClick={enable}
      disabled={loading}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest cursor-pointer"
    >
      {loading ? "Loading..." : "Connect Wallet"}
    </button>
  )
}
