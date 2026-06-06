export function useDeposit() { return { deposit: () => {}, txHash: undefined, error: null, isPending: false } }
export function useAcquireStateLock() { return { acquire: () => {}, txHash: undefined, error: null, isPending: false } }
export function useResolveStateLock() { return { resolve: () => {}, txHash: undefined, error: null, isPending: false } }
export function useIsWalletLocked() { return false }
export function useWatchLocks() {}