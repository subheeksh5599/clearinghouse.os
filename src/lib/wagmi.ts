import { http, createConfig } from "wagmi"
import { sepolia, optimismSepolia, arbitrumSepolia } from "wagmi/chains"
import { getDefaultConfig } from "@rainbow-me/rainbowkit"

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "clearinghouse-os"

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "ClearingHouse.OS",
    projectId,
    chains: [sepolia, optimismSepolia, arbitrumSepolia],
    transports: {
      [sepolia.id]: http("https://eth.llamarpc.com"),
      [optimismSepolia.id]: http("https://sepolia.optimism.io"),
      [arbitrumSepolia.id]: http("https://sepolia-rollup.arbitrum.io/rpc"),
    },
    ssr: false,
  }),
)
