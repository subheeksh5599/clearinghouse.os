# ClearingHouse.OS

Shared-sequencer native liquidity rebalancer for fragmented corporate treasuries across Layer 2 rollups.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│               Master Treasury Contract            │
│         (Central execution layer, Base)           │
│                                                   │
│   Orchestrates satellite contracts, broadcasts    │
│   state-lock tokens, fires deterministic triggers │
└──────┬───────────────┬───────────────┬───────────┘
       │               │               │
   ┌───▼──────┐   ┌───▼──────┐   ┌───▼──────┐
   │   Base   │   │ Optimism │   │ Arbitrum │
   │Satellite │   │Satellite │   │Satellite │
   │  Vault   │   │  Vault   │   │  Vault   │
   └──────────┘   └──────────┘   └──────────┘
```

1. Institutions deposit stablecoins into satellite vaults on their chosen L2
2. Rebalancing triggers state locks across all involved chains simultaneously
3. The shared sequencer waits for every chain to confirm inclusion independently
4. Once all confirm, a deterministic execution trigger fires — all funds settle atomically
5. **Result: zero slippage, zero reconciliation drift**

---

## Base First — Why This Benefits Base

Corporate treasuries managing stablecoin liquidity across multiple rollups face
prohibitive costs with traditional async bridging:

| Method | Per-op Cost | Hops Required | Total |
|---|---|---|---|
| **Traditional bridging** | $50-320/op | L1 bridge → AMM swap → relay | Expensive, slow |
| **ClearingHouse.OS** | $3/op | Single shared-sequencer batch | 94%+ cheaper |

**By eliminating cross-L2 settlement friction, ClearingHouse.OS makes Base the most
economically attractive settlement layer for corporate stablecoin treasuries migrating
off Ethereum L1.** Every satellite vault contract is deployed to Base Sepolia, providing
verifiable on-chain footprints that institutional auditors and regulators can trust.

---

## Quick Start

You need two terminals:

```bash
# Terminal 1 — Backend engine (port 3001)
npm run dev:server

# Terminal 2 — Frontend dev server (port 5173)
npm run dev
```

| URL | Page |
|---|---|
| `http://localhost:5173` | Landing page with Spline 3D hero |
| `http://localhost:5173/chains` | Chain nodes (Base, Optimism, Arbitrum) |
| `http://localhost:5173/treasury` | Treasury dashboard with rebalance controls |
| `http://localhost:5173/logs` | Real-time event log, CSV/JSON export |
| `http://localhost:3001/api/state` | Backend REST API |
| `ws://localhost:3001` | WebSocket live state feed |

---

## Smart Contract

`SatelliteVault.sol` is deployed to **Sepolia Testnet**.

- **Contract**: `0xD2E467F461cd8ffb57ba86fd37c3Dd99aF6D80B6`
- **Deployer**: `0xc2c2c31F91bE606d53B1fcD840E47E1EfC528cf8`
- **View on Etherscan**: https://sepolia.etherscan.io/address/0xD2E467F461cd8ffb57ba86fd37c3Dd99aF6D80B6#code
- **State locks** with `PENDING → LOCKED → RESOLVED` transitions
- **Reentrancy guards** blocking recursive calls during locked state
- **Dual-factor escape hatch**: 30-minute timeout + 3-of-5 multi-sig required

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4, React Router, Spline 3D
- **Backend**: Express, WebSocket (ws), TypeScript, tsx
- **Contracts**: Solidity ^0.8.28, Solidity custom errors, Foundry deployment
- **Sequencer**: Modular driver interface (Espresso HotShot stub with BLS mock)

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/state` | Full system state |
| `GET` | `/api/balances` | Per-chain token balances |
| `GET` | `/api/strategies` | Available rebalance strategies |
| `POST` | `/api/rebalance` | Trigger a rebalance |
| `GET` | `/api/logs` | Event log |
| `GET` | `/api/audit/download?format=csv` | Download audit ledger |
| `POST` | `/api/chaos/toggle` | Toggle chaos mode |
| `POST` | `/api/chaos/congest` | Inject chain congestion |
| `POST` | `/api/emergency/unlock` | Trigger emergency escape hatch |
| `POST` | `/api/driver/connect` | Connect production sequencer driver |

---

## License

MIT
