#!/usr/bin/env node

/**
 * ClearingHouse.OS — Deployment Script
 *
 * Deploys SatelliteVault.sol to Base Sepolia Testnet.
 *
 * Prerequisites:
 *   1. Install dependencies:  npm install -D hardhat @nomicfoundation/hardhat-toolbox dotenv
 *   2. Create .env file with:
 *        BASE_SEPOLIA_RPC=https://sepolia.base.org
 *        PRIVATE_KEY=your_deployer_private_key
 *   3. Fund deployer wallet with Base Sepolia ETH from faucet:
 *        https://www.coinbase.com/faucets/base-sepolia-faucet
 *   4. Run:  node scripts/deploy.mjs
 *
 * After deployment, verify on BaseScan:
 *   forge verify-contract <ADDRESS> contracts/SatelliteVault.sol:SatelliteVault \
 *     --verifier-url https://api-sepolia.basescan.org/api \
 *     --etherscan-api-key <BASESCAN_API_KEY> \
 *     --constructor-args $(cast abi-encode "constructor(address,address[5])" <MASTER> "[addr1,addr2,addr3,addr4,addr5]")
 */

import { execSync } from "child_process"

// ── Configuration ──────────────────────────────────────────────

const RPC_URL = process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org"
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? ""

// Multi-sig governance board (5 addresses for 3-of-5 escape hatch)
const MULTISIG_SIGNERS = [
  "0x0000000000000000000000000000000000000001", // Replace with real addresses
  "0x0000000000000000000000000000000000000002",
  "0x0000000000000000000000000000000000000003",
  "0x0000000000000000000000000000000000000004",
  "0x0000000000000000000000000000000000000005",
]

const MASTER_CONTRACT = "0x0000000000000000000000000000000000000000" // Replace after master deployment

// ── Build ABI-encoded constructor args ─────────────────────────

function encodeConstructorArgs(master: string, signers: string[]): string {
  // Solidity: constructor(address,address[5])
  // ABI-encoded: 32 bytes offset for array, master address, 5 addresses
  let encoded = ""
  // Parameter 1: master address (padded to 32 bytes)
  encoded += "000000000000000000000000" + master.slice(2).toLowerCase()
  // Parameter 2: array offset (0x40 = 64 bytes from start of args data)
  encoded += "0000000000000000000000000000000000000000000000000000000000000040"
  // Array length (5)
  encoded += "0000000000000000000000000000000000000000000000000000000000000005"
  // 5 addresses
  for (const signer of signers) {
    encoded += "000000000000000000000000" + signer.slice(2).toLowerCase()
  }
  return "0x" + encoded
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════╗")
  console.log("║   ClearingHouse.OS — Deployment          ║")
  console.log("║   SatelliteVault → Base Sepolia           ║")
  console.log("╚══════════════════════════════════════════╝")
  console.log("")

  if (!PRIVATE_KEY) {
    console.log("⚠  PRIVATE_KEY not set in .env — running in dry-run mode")
    console.log("")
  }

  const constructorArgs = encodeConstructorArgs(MASTER_CONTRACT, MULTISIG_SIGNERS)

  console.log("Target Network:  Base Sepolia")
  console.log(`RPC:             ${RPC_URL}`)
  console.log(`Master Contract: ${MASTER_CONTRACT}`)
  console.log(`Multi-sig Board: ${MULTISIG_SIGNERS.length} signers (${3}/${5} threshold)`)
  console.log("")

  console.log("Contract:  contracts/SatelliteVault.sol")
  console.log("Compiler:  Solidity ^0.8.28")
  console.log("")

  if (PRIVATE_KEY) {
    console.log("Deploying via forge create...")
    console.log("")
    const cmd = [
      "forge create",
      "contracts/SatelliteVault.sol:SatelliteVault",
      `--rpc-url ${RPC_URL}`,
      `--private-key ${PRIVATE_KEY}`,
      `--constructor-args ${constructorArgs}`,
      "--legacy",
    ].join(" ")

    console.log(`$ ${cmd}`)
    console.log("")
    try {
      const output = execSync(cmd, { encoding: "utf-8", stdio: "pipe" })
      console.log(output)
    } catch (err) {
      console.log("Deployment failed. Install Foundry:")
      console.log("  curl -L https://foundry.paradigm.xyz | bash")
      console.log("  foundryup")
    }
  } else {
    console.log("Dry-run constructor args (hex):")
    console.log(`  ${constructorArgs}`)
    console.log("")
    console.log("To deploy:")
    console.log("  1. Set PRIVATE_KEY in .env")
    console.log("  2. Install Foundry: curl -L https://foundry.paradigm.xyz | bash")
    console.log("  3. Run: node scripts/deploy.mjs")
    console.log("")
  }

  console.log("After deployment, verify on BaseScan:")
  console.log("  https://sepolia.basescan.org/verifyContract")
  console.log("")
  console.log("Once verified, update this URL in the frontend footer:")
  console.log(`  https://sepolia.basescan.org/address/<DEPLOYED_ADDRESS>#code`)
}

main().catch(console.error)
