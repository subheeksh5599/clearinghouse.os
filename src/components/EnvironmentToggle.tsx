import { useEnvironment } from "@/hooks/useEnvironment"
import { ConnectButton } from "@rainbow-me/rainbowkit"

export default function EnvironmentToggle() {
  const { env, setEnv, isLive } = useEnvironment()

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setEnv(isLive ? "local" : "testnet")}
        className={`text-[9px] uppercase tracking-widest px-3 py-1.5 rounded font-bold transition-all ${
          isLive
            ? "bg-primary/10 text-primary border border-primary/30"
            : "bg-muted/20 text-muted-foreground border border-border"
        }`}
      >
        {isLive ? "LIVE TESTNET" : "LOCAL SIM"}
      </button>
      {isLive && <ConnectButton />}
    </div>
  )
}
