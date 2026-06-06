const DEPLOYED_ADDRESS = "0xD2E467F461cd8ffb57ba86fd37c3Dd99aF6D80B6"
const BASESCAN_URL = `https://sepolia.etherscan.io/address/${DEPLOYED_ADDRESS}#code`
const TX_URL = `https://sepolia.etherscan.io/tx/0xf9bad54a5d389885cf1d84b1fa9d526553045da8f0e946b58849b2406ddcda4c`

const REPO_BASE = "https://github.com/subheeksh5599/clearinghouse.os/blob/main"

const links = [
  {
    label: "SatelliteVault.sol — Deployed",
    href: BASESCAN_URL,
    desc: "Live contract verified on Sepolia Etherscan — state locks, reentrancy guards, escape hatch",
  },
  {
    label: "Deployment Transaction",
    href: TX_URL,
    desc: `Deployed to ${DEPLOYED_ADDRESS.slice(0, 10)}... by 0xc2c2c31F...528cf8`,
  },
  {
    label: "Chaos Mode Simulation",
    href: `${REPO_BASE}/server/sequencer/SharedSequencer.ts`,
    desc: "Network congestion injection & deterministic trigger logic",
  },
  {
    label: "Escape Hatch Architecture",
    href: `${REPO_BASE}/server/contracts/SatelliteContract.ts`,
    desc: "Dual-factor 30-min timeout + 3-of-5 multi-sig override",
  },
  {
    label: "Espresso Driver (BLS Mock)",
    href: `${REPO_BASE}/server/sequencer/drivers/EspressoDriver.ts`,
    desc: "Production HotShot driver with BLS threshold signature verification",
  },
  {
    label: "SatelliteVault.sol (Source)",
    href: `${REPO_BASE}/contracts/SatelliteVault.sol`,
    desc: "Full Solidity contract with NatSpec documentation",
  },
]

export default function VerifiabilityFooter() {
  return (
    <footer className="bg-hero-bg border-t border-border">
      <div className="px-8 lg:px-16 py-12 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">
            Technical Spec & Verifiability
          </h2>
          <span className="text-[10px] text-muted-foreground/50">
            Open-source · MIT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-muted/20 border border-border/50 rounded-sm px-4 py-3 hover:border-muted-foreground/30 hover:bg-muted/30 transition-all group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-foreground font-medium group-hover:text-primary transition-colors">
                  {link.label}
                </span>
                <span className="text-[9px] text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors">
                  ↗
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground/50">{link.desc}</p>
            </a>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-[9px] text-muted-foreground/30">
            ClearingHouse.OS · Shared-Sequencer Native Liquidity Rebalancer · MIT License
          </p>
        </div>
      </div>
    </footer>
  )
}
