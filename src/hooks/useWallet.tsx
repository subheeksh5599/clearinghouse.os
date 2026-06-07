import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

interface WalletState {
  account: string | null
  chainId: string | null
  connect: () => Promise<void>
  disconnect: () => void
  loading: boolean
  error: string | null
  dismissError: () => void
}

const WalletContext = createContext<WalletState>({
  account: null,
  chainId: null,
  connect: async () => {},
  disconnect: () => {},
  loading: false,
  error: null,
  dismissError: () => {},
})

function getEthereum() {
  return (window as unknown as Record<string, unknown>).ethereum as {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    on: (event: string, cb: (...args: unknown[]) => void) => void
  } | undefined
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const ethereum = getEthereum()
      if (!ethereum) { setError("No wallet detected"); return }
      const accounts = await ethereum.request({ method: "eth_requestAccounts" }) as string[]
      if (accounts.length > 0) {
        setAccount(accounts[0])
        const chain = await ethereum.request({ method: "eth_chainId" }) as string
        setChainId(chain)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection rejected"
      if (message.includes("rejected") || message.includes("denied")) setError("Rejected")
      else setError(message.slice(0, 40))
    }
    setLoading(false)
  }, [])

  const disconnect = useCallback(() => {
    setAccount(null)
    setChainId(null)
    setError(null)
  }, [])

  const dismissError = useCallback(() => setError(null), [])

  // Persist across page navigations — listen for events
  useEffect(() => {
    const ethereum = getEthereum()
    if (!ethereum) return

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[]
      if (accounts.length === 0) disconnect()
      else setAccount(accounts[0])
    }
    const handleChainChanged = (id: unknown) => setChainId(id as string)

    ethereum.on("accountsChanged", handleAccountsChanged)
    ethereum.on("chainChanged", handleChainChanged)

    // Reconnect on mount if already authorized
    ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if ((accounts as string[]).length > 0) {
        setAccount((accounts as string[])[0])
        ethereum.request({ method: "eth_chainId" }).then((id) => setChainId(id as string))
      }
    }).catch(() => {})

    return () => {
      ethereum.on("accountsChanged", handleAccountsChanged)
      ethereum.on("chainChanged", handleChainChanged)
    }
  }, [disconnect])

  return (
    <WalletContext.Provider value={{ account, chainId, connect, disconnect, loading, error, dismissError }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
