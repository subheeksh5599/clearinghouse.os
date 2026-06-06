import { type ReactNode } from "react"

// Wallet is now integrated into the navbar via NavWalletButton on each page.
// WalletShell is a no-op wrapper that passes through children unchanged.
export default function WalletShell({ children }: { children: ReactNode }) {
  return <>{children}</>
}
