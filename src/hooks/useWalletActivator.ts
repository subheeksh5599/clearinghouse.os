import { useState } from "react"

export function useWalletActivator() {
  const [active, setActive] = useState(false)

  const enable = async () => {
    try {
      const [{ WagmiProvider }, { QueryClient, QueryClientProvider }, { RainbowKitProvider, ConnectButton }, { wagmiConfig }] = await Promise.all([
        import("wagmi"),
        import("@tanstack/react-query"),
        import("@rainbow-me/rainbowkit"),
        import("@/lib/wagmi"),
      ])
      const qc = new QueryClient()
      const walletUi = (
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={qc}>
            <RainbowKitProvider>
              <ConnectButton />
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      )
      setWallet(walletUi)
      setActive(true)
    } catch {
      // silently fail
    }
  }

  const [Wallet, setWallet] = useState<React.ReactNode>(null)

  return { active, enable, Wallet }
}
