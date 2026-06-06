import { type ReactNode, useState } from "react"

export default function WalletShell({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [Mount, setMount] = useState<ReactNode>(null)

  const enable = async () => {
    try {
      const [{ WagmiProvider }, { QueryClient, QueryClientProvider }, { RainbowKitProvider, ConnectButton }, { wagmiConfig }] = await Promise.all([
        import("wagmi"),
        import("@tanstack/react-query"),
        import("@rainbow-me/rainbowkit"),
        import("@/lib/wagmi"),
      ])
      const qc = new QueryClient()
      setMount(
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={qc}>
            <RainbowKitProvider>
              <div className="fixed top-20 right-8 z-[100]">
                <ConnectButton />
              </div>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      )
      setActive(true)
    } catch {
      // wallet failed to load silently
    }
  }

  return (
    <>
      {children}
      {active && Mount}
      {!active && (
        <div className="fixed top-20 right-8 z-[100]">
          <button
            type="button"
            onClick={enable}
            className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-4 py-2 rounded font-bold hover:brightness-110 transition-all active:scale-[0.97]"
          >
            Connect Wallet
          </button>
        </div>
      )}
    </>
  )
}
