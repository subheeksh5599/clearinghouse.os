import { BrowserRouter, Routes, Route } from "react-router-dom"
import { EnvironmentProvider } from "@/hooks/useEnvironment"
import { WalletProvider } from "@/hooks/useWallet"
import WalletShell from "@/components/WalletShell"
import LandingPage from "@/pages/LandingPage"
import ChainsPage from "@/pages/ChainsPage"
import TreasuryPage from "@/pages/TreasuryPage"
import LogsPage from "@/pages/LogsPage"

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <EnvironmentProvider>
          <WalletShell>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/chains" element={<ChainsPage />} />
              <Route path="/treasury" element={<TreasuryPage />} />
              <Route path="/logs" element={<LogsPage />} />
            </Routes>
          </WalletShell>
        </EnvironmentProvider>
      </BrowserRouter>
    </WalletProvider>
  )
}
