import { createContext, useContext, useState, type ReactNode } from "react"

type Environment = "local" | "testnet"

interface EnvironmentContextType {
  env: Environment
  setEnv: (env: Environment) => void
  isLive: boolean
}

const EnvironmentContext = createContext<EnvironmentContextType>({
  env: "local",
  setEnv: () => {},
  isLive: false,
})

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [env, setEnv] = useState<Environment>("local")

  return (
    <EnvironmentContext.Provider value={{ env, setEnv, isLive: env === "testnet" }}>
      {children}
    </EnvironmentContext.Provider>
  )
}

export function useEnvironment() {
  return useContext(EnvironmentContext)
}
