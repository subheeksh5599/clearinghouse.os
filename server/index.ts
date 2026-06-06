import express from "express"
import cors from "cors"
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { WebSocketServer, WebSocket } from "ws"
import { ChainRegistry } from "./chains/ChainRegistry.ts"
import { SatelliteContract } from "./contracts/SatelliteContract.ts"
import { MasterTreasuryContract } from "./contracts/MasterTreasuryContract.ts"
import { SharedSequencer } from "./sequencer/SharedSequencer.ts"
import { RebalanceEngine } from "./engine/RebalanceEngine.ts"
import { createSequencerDriver } from "./sequencer/drivers/EspressoDriver.ts"
import type { ChainId, SystemState, AuditRecord } from "./types.ts"

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const AUDIT_FILE = path.resolve("./clearinghouse-audit.jsonl")

// ── Core engine ────────────────────────────────────────────────

const chains = new ChainRegistry()

const master = new MasterTreasuryContract()
const sequencer = new SharedSequencer(chains)
master.setSequencer(sequencer)
sequencer.setMaster(master)

const satellites = new Map<ChainId, SatelliteContract>()
for (const chainId of ["base", "optimism", "arbitrum"] as ChainId[]) {
  const sat = new SatelliteContract(chainId, chains.getNode(chainId))
  satellites.set(chainId, sat)
  master.registerSatellite(chainId, sat)
}

const engine = new RebalanceEngine(master)

const startTime = Date.now()
const clients = new Set<WebSocket>()

// ── Persistent audit log ───────────────────────────────────────

function persistAuditRecord(record: AuditRecord): void {
  try {
    fs.appendFileSync(AUDIT_FILE, JSON.stringify(record) + "\n", "utf-8")
  } catch {
    // non-blocking — log failure doesn't crash the server
  }
}

// ── System state snapshot ──────────────────────────────────────

function getSystemState(): SystemState {
  const auditRecords = master.getAuditRecords(2000)
  for (const rec of auditRecords) {
    persistAuditRecord(rec)
  }

  return {
    masterWallet: { ...master.masterWallet },
    chains: chains.getAllStates(),
    activeBatches: master.getActiveBatches(),
    completedBatches: [...master["completedBatches"]].slice(-20),
    logs: master.getLogs(30),
    totalRebalanced: master.totalRebalanced,
    totalStateLocks: master.totalStateLocks,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    congestion: sequencer.getCongestionSnapshot(),
    gasSavings: master.getGasSavingsEstimate(),
  }
}

function broadcast(): void {
  const state = getSystemState()
  const payload = JSON.stringify(state)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  }
}

setInterval(broadcast, 1000)

// ── WebSocket ─────────────────────────────────────────────────

wss.on("connection", (ws) => {
  clients.add(ws)
  console.log(`[WS] Client connected (${clients.size} total)`)

  ws.send(JSON.stringify(getSystemState()))

  ws.on("close", () => {
    clients.delete(ws)
    console.log(`[WS] Client disconnected (${clients.size} total)`)
  })
})

// ── REST: State ────────────────────────────────────────────────

app.get("/api/state", (_req, res) => {
  res.json(getSystemState())
})

app.get("/api/chains", (_req, res) => {
  res.json(chains.getAllStates())
})

app.get("/api/balances", (_req, res) => {
  res.json(master.getAllSatelliteBalances())
})

app.get("/api/batches", (_req, res) => {
  res.json({
    active: master.getActiveBatches(),
    completed: master["completedBatches"].slice(-20),
  })
})

app.get("/api/logs", (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50
  res.json(master.getLogs(limit))
})

app.get("/api/strategies", (_req, res) => {
  res.json(engine.getStrategies())
})

app.get("/api/strategy/:name/analysis", (req, res) => {
  const moves = engine.computeRequiredMoves(req.params.name)
  res.json({
    strategy: req.params.name,
    movesRequired: moves.length,
    operations: moves,
    currentBalances: master.masterWallet.balances,
  })
})

app.post("/api/rebalance", async (req, res) => {
  const { strategy, customOperations } = req.body

  try {
    if (customOperations && Array.isArray(customOperations)) {
      const batch = await master.initiateRebalance(customOperations)
      res.json({ success: true, batchId: batch.id, status: batch.status })
    } else {
      const result = await engine.executeStrategy(strategy ?? "balanced")
      res.json({ success: result.successful, operationsTriggered: result.operations })
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Rebalance failed",
    })
  }
})

// ── REST: Gas Savings ─────────────────────────────────────────

app.get("/api/gas-savings", (_req, res) => {
  res.json(master.getGasSavingsEstimate())
})

// ── REST: Audit Log ────────────────────────────────────────────

app.get("/api/audit/download", (req, res) => {
  const format = (req.query.format as string) || "json"

  const records = master.getAuditRecords(2000)

  if (format === "csv") {
    const headers = ["id", "timestamp", "isoDate", "category", "level", "chainId", "batchId", "amount", "token", "message"]
    const csvRows = [headers.join(",")]
    for (const r of records) {
      csvRows.push(
        [r.id, r.timestamp, r.isoDate, r.category, r.level, r.chainId, r.batchId, r.amount ?? "", r.token ?? "", `"${(r.message ?? "").replace(/"/g, '""')}"`].join(","),
      )
    }
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename="clearinghouse-audit-${Date.now()}.csv"`)
    res.send(csvRows.join("\n"))
  } else {
    res.setHeader("Content-Type", "application/json")
    res.setHeader("Content-Disposition", `attachment; filename="clearinghouse-audit-${Date.now()}.json"`)
    res.json(records)
  }
})

app.get("/api/audit/ledger", (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100
  res.json(master.getAuditRecords(limit))
})

// ── REST: Emergency Escape Hatch ───────────────────────────────

app.post("/api/emergency/approve", (req, res) => {
  const { lockId, signer } = req.body
  if (!lockId || !signer) {
    res.status(400).json({ success: false, reason: "lockId and signer required" })
    return
  }
  const result = master.approveEmergencyUnlock(lockId, signer)
  res.json(result)
})

app.post("/api/emergency/unlock", (req, res) => {
  const { lockId, caller } = req.body
  if (!lockId || !caller) {
    res.status(400).json({ success: false, reason: "lockId and caller required" })
    return
  }
  const result = master.triggerEmergencyUnlock(lockId, caller)
  res.json(result)
})

app.get("/api/emergency/stale-locks", (_req, res) => {
  res.json(master.getStaleLocks())
})

app.get("/api/emergency/status/:lockId", (req, res) => {
  const status = master.checkLockEmergencyStatus(req.params.lockId)
  res.json(status)
})

// ── REST: Chaos Mode ───────────────────────────────────────────

app.post("/api/chaos/toggle", (req, res) => {
  sequencer.chaosEnabled = !sequencer.chaosEnabled
  if (!sequencer.chaosEnabled) {
    sequencer.resetCongestion()
  }
  res.json({
    chaosEnabled: sequencer.chaosEnabled,
    congestion: sequencer.getCongestionSnapshot(),
  })
})

app.post("/api/chaos/congest", (req, res) => {
  const { chainId, extraLatencyMs, reason } = req.body
  if (!chainId || !extraLatencyMs) {
    res.status(400).json({ success: false, reason: "chainId and extraLatencyMs required" })
    return
  }
  sequencer.simulateCongestion(chainId, extraLatencyMs, reason ?? "Manual chaos injection")
  res.json({
    success: true,
    congestion: sequencer.getCongestionSnapshot(),
  })
})

app.post("/api/chaos/clear", (req, res) => {
  const { chainId } = req.body
  if (chainId) {
    sequencer.clearCongestion(chainId as ChainId)
  } else {
    sequencer.resetCongestion()
  }
  res.json({
    success: true,
    congestion: sequencer.getCongestionSnapshot(),
  })
})

app.get("/api/chaos/status", (_req, res) => {
  res.json({
    chaosEnabled: sequencer.chaosEnabled,
    congestion: sequencer.getCongestionSnapshot(),
  })
})

// ── REST: Production Driver ────────────────────────────────────

app.post("/api/driver/connect", (req, res) => {
  const { driver } = req.body
  try {
    const sequencerDriver = createSequencerDriver(driver ?? "espresso")
    sequencer.setProductionDriver(sequencerDriver)
    res.json({ success: true, driver: sequencerDriver.name, version: sequencerDriver.version })
  } catch (err) {
    res.status(400).json({ success: false, error: err instanceof Error ? err.message : "Unknown driver" })
  }
})

// ── Health ────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    activeClients: clients.size,
    chainsOnline: Object.values(chains.getAllStates()).every((c) => c.isOnline),
    chaosEnabled: sequencer.chaosEnabled,
    auditFileExists: fs.existsSync(AUDIT_FILE),
    auditFileSizeBytes: fs.existsSync(AUDIT_FILE) ? fs.statSync(AUDIT_FILE).size : 0,
  })
})

chains.startAll()

const PORT = parseInt(process.env.PORT ?? "3001")
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   ClearingHouse.OS — Backend Engine      ║
║   Shared-Sequencer Native Liquidity      ║
║   Rebalancer v1.0.0                       ║
╠══════════════════════════════════════════╣
║   REST API : http://localhost:${PORT}/api    ║
║   WebSocket: ws://localhost:${PORT}          ║
║   Health   : http://localhost:${PORT}/health ║
╚══════════════════════════════════════════╝
`)
})
