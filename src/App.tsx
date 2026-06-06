import { useState, lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { EnvironmentProvider } from "@/hooks/useEnvironment"
import LandingPage from "@/pages/LandingPage"
import ChainsPage from "@/pages/ChainsPage"
import TreasuryPage from "@/pages/TreasuryPage"
import LogsPage from "@/pages/LogsPage"
import "@rainbow-me/rainbowkit/styles.css"

const WalletProviders = lazy(() => import("@/components/WalletProviders"))

export default function App() {
  const [walletActive, setWalletActive] = useState(false)

  const routes = (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/chains" element={<ChainsPage />} />
      <Route path="/treasury" element={<TreasuryPage />} />
      <Route path="/logs" element={<LogsPage />} />
    </Routes>
  )

  const pageContent = (
    <BrowserRouter>
      <EnvironmentProvider>
        {walletActive ? (
          <Suspense fallback={routes}>
            <WalletProviders>
              {routes}
            </WalletProviders>
          </Suspense>
        ) : (
          <>
            <WalletLoader onSuccess={() => setWalletActive(true)} />
            {routes}
          </>
        )}
      </EnvironmentProvider>
    </BrowserRouter>
  )

  return pageContent
}

function WalletLoader({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [hidden, setHidden] = useState(false)

  if (hidden) return null

  const tryLoad = async () => {
    setLoading(true)
    try {
      await import("wagmi")
      await import("@rainbow-me/rainbowkit")
      onSuccess()
    } catch {
      setHidden(true)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      <button
        type="button"
        className="bg-muted/80 border border-border text-muted-foreground text-[10px] uppercase tracking-widest px-3 py-1.5 rounded cursor-pointer hover:border-primary/40 hover:text-foreground transition-all"
        onClick={tryLoad}
        disabled={loading}
      >
        {loading ? "Loading..." : "Enable Wallet"}
      </button>
    </div>
  )
}
