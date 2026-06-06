import { Link } from "react-router-dom"
import SplineBackground from "@/components/SplineBackground"
import VerifiabilityFooter from "@/components/VerifiabilityFooter"
import NavWalletButton from "@/components/NavWalletButton"

const navLinks = [
  { label: "Chains", to: "/chains" },
  { label: "Treasury", to: "/treasury" },
  { label: "Logs", to: "/logs" },
]

export default function LandingPage() {
  return (
    <div className="bg-hero-bg min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-5">
        <Link to="/" className="text-foreground text-xl font-semibold tracking-tight">
          CLEARINGHOUSE<span className="text-primary">.OS</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
            >
              {link.label}
            </Link>
          ))}
          <NavWalletButton />
        </div>

        <Link
          to="/treasury"
          className="hidden md:inline-flex items-center justify-center text-foreground bg-nav-button hover:bg-nav-button/80 active:scale-[0.97] transition-all rounded-lg uppercase text-xs tracking-widest px-6 h-10"
        >
          Open Treasury
        </Link>
      </nav>

      <section className="relative min-h-screen flex items-end overflow-hidden" style={{ background: "hsl(0 0% 8%)" }}>
        <div className="absolute inset-0">
          <SplineBackground />
        </div>

        <div className="absolute inset-0 bg-black/30 z-[1] pointer-events-none" />

        <div className="relative z-10 pointer-events-none w-full max-w-[90%] sm:max-w-md lg:max-w-2xl px-6 md:px-10 pb-10 md:pb-10 pt-32">
          <h1
            className="text-[clamp(3rem,8vw,6rem)] font-bold leading-[1.05] tracking-[-0.05em] text-foreground mb-2 md:mb-4 uppercase animate-fade-up"
          >
            CLEARINGHOUSE
            <span className="text-primary">.OS</span>
          </h1>

          <p
            className="text-foreground/80 text-[clamp(1.125rem,2.5vw,1.875rem)] font-light mb-3 md:mb-6 animate-fade-up"
            style={{ animationDelay: "0.15s" }}
          >
            Shared-sequencer native liquidity rebalancing for fragmented corporate treasuries.
          </p>

          <p
            className="text-muted-foreground text-[clamp(0.875rem,1.5vw,1.25rem)] font-light mb-4 md:mb-8 animate-fade-up"
            style={{ animationDelay: "0.25s" }}
          >
            Master treasury contracts orchestrate satellite contracts across Base, Optimism, and Arbitrum.
            Asynchronous multi-chain state locks fire deterministic execution triggers — all confirmed
            within a single shared-sequencer batch. Zero slippage, zero reconciliation drift.
          </p>

          <div
            className="flex flex-wrap gap-3 font-bold animate-fade-up"
            style={{ animationDelay: "0.35s" }}
          >
            <Link
              to="/treasury"
              className="pointer-events-auto inline-block bg-primary text-primary-foreground px-6 py-3 md:px-8 md:py-4 text-sm rounded-sm cursor-pointer hover:brightness-110 transition-all active:scale-[0.97]"
            >
              Open Treasury
            </Link>
            <Link
              to="/chains"
              className="pointer-events-auto inline-block bg-white text-background px-6 py-3 md:px-8 md:py-4 text-sm rounded-sm cursor-pointer hover:brightness-90 transition-all active:scale-[0.97]"
            >
              View Chain Nodes
            </Link>
          </div>

          <p
            className="text-muted-foreground/60 text-xs font-light mt-4 md:mt-6 animate-fade-up"
            style={{ animationDelay: "0.45s" }}
          >
            Live engine — Base 2000ms blocks · Optimism 2000ms · Arbitrum 250ms
          </p>
        </div>
      </section>
      <VerifiabilityFooter />
    </div>
  )
}
