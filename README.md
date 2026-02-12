# SolSwitch - One-Click Chain Migration to Solana

> Built for the Colosseum Agent Hackathon 2026

## What is SolSwitch?

SolSwitch is an autonomous agent that helps users migrate their EVM positions (Ethereum, BSC, Polygon) to Solana equivalents with a single click. It scans wallets, maps tokens, calculates fee savings, and executes the migration.

## Features

- **Multi-Chain Wallet Scanner** - Scan ETH, BSC, and Polygon wallets for token balances
- **Smart Token Mapping** - Maps 13+ EVM tokens to their Solana equivalents (ETH→SOL, USDC→USDC, WBTC→tBTC, etc.)
- **Fee Savings Calculator** - Real-time comparison showing Solana's 5,000x fee advantage over Ethereum
- **Migration Engine** - Automated bridging via Wormhole + Jupiter swaps on Solana
- **Visual Dashboard** - Clean UI showing portfolio, migration routes, and savings

## How It Works

1. **Scan** - Connect your EVM wallet address and select chain
2. **Plan** - SolSwitch generates an optimized migration plan with fee estimates
3. **Migrate** - Execute the migration with Wormhole bridging + Jupiter swaps
4. **Save** - Enjoy dramatically lower fees on Solana

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JS + CSS (no build step needed)
- **Solana**: @solana/web3.js for devnet integration
- **DEX**: Jupiter API v6 for Solana swaps
- **Bridge**: Wormhole SDK for cross-chain transfers
- **Token Mapping**: Custom engine with 13+ token pairs

## Quick Start

```bash
npm install
npm start
# Open http://localhost:3847
```

## API Endpoints

- `POST /api/scan` - Scan EVM wallet for tokens
- `POST /api/migrate/plan` - Generate migration plan with fee estimates
- `POST /api/migrate/execute` - Execute migration (devnet)
- `GET /api/fees/compare` - Compare gas costs across chains
- `GET /api/jupiter/quote` - Get Jupiter swap quotes
- `GET /api/solana/balance/:address` - Check Solana devnet balance

## Solana Integration

- **Devnet deployment** for safe testing
- **Jupiter API** for optimal swap routing on Solana
- **Wormhole** for cross-chain bridging to Solana
- **@solana/web3.js** for balance queries and transaction handling
- Token mapping to native Solana SPL tokens

## License

MIT
