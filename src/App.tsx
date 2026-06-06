import "@rainbow-me/rainbowkit/styles.css"
import { RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Component, type ReactNode } from "react"
import { wagmiConfig } from "@/lib/wagmi"
import { EnvironmentProvider } from "@/hooks/useEnvironment"
import LandingPage from "@/pages/LandingPage"
import ChainsPage from "@/pages/ChainsPage"
import TreasuryPage from "@/pages/TreasuryPage"
import LogsPage from "@/pages/LogsPage"

const queryClient = new QueryClient()

class WalletErrorBoundary extends Component<{ children: ReactNode }> {
  state = { crashed: false }
  componentDidCatch() {
    this.setState({ crashed: true })
  }
  render() {
    if (this.state.crashed) {
      return (
        <EnvironmentProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/chains" element={<ChainsPage />} />
              <Route path="/treasury" element={<TreasuryPage />} />
              <Route path="/logs" element={<LogsPage />} />
            </Routes>
          </BrowserRouter>
        </EnvironmentProvider>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <WalletErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <EnvironmentProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/chains" element={<ChainsPage />} />
                  <Route path="/treasury" element={<TreasuryPage />} />
                  <Route path="/logs" element={<LogsPage />} />
                </Routes>
              </BrowserRouter>
            </EnvironmentProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </WalletErrorBoundary>
  )
}
