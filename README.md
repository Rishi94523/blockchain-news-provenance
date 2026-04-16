# Blockchain News Provenance MVP

Demo-ready monorepo for tracking article origin and revision history with:

- Next.js web app
- Solidity smart contract on a private EVM chain
- PostgreSQL-backed off-chain storage via Prisma
- Shared hashing and validation utilities
- Event indexer for syncing contract events into the database

## What "private Ethereum" means here

This project uses a private Ethereum-compatible blockchain network for provenance.

- It is not a UI library.
- It is not an internet feature embedded in the frontend.
- It is your own EVM chain, usually local for development or privately hosted for demos.

In this MVP, the intended setup is:

- a local Hardhat node for the private chain
- MetaMask or another EVM wallet connected to that local chain
- the provenance contract deployed to that chain
- the Next.js app reading and writing through the RPC endpoint

If you later want broader transparency, you can move from a private/local chain to a public testnet or public network without changing the core provenance model.

## Workspaces

- `apps/web` - UI and API routes
- `packages/shared` - shared types, schemas, and hashing utilities
- `packages/contracts` - Hardhat project and `NewsProvenanceRegistry`
- `packages/indexer` - chain event sync worker

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
copy apps\\web\\.env.example apps\\web\\.env.local
```

3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Start a local Hardhat node:

```bash
npm run dev:node --workspace @news-provenance/contracts
```

5. Deploy the contract:

```bash
npm run deploy:local --workspace @news-provenance/contracts
```

6. Update `apps/web/.env.local` with:

- deployed `CONTRACT_ADDRESS`
- matching `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `ADMIN_PRIVATE_KEY`
- `ADMIN_WALLET_ADDRESS`

For a local Hardhat node, the default first account is usually:

- address: `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`
- private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

7. Run Prisma migrations:

```bash
npm run prisma:generate --workspace @news-provenance/web
npm run prisma:migrate --workspace @news-provenance/web
```

8. Start the app:

```bash
npm run dev
```

9. Optionally run the indexer in another terminal:

```bash
npm run indexer
```

## Demo assumptions

- Wallet identity is handled through a lightweight SIWE flow.
- Admin wallet is configured through environment variables.
- Articles are stored off-chain; hashes and revision metadata are stored on-chain.

## Current status

Implemented:

- Next.js landing, admin, publisher, article, and verification pages
- wallet-based SIWE session flow
- smart contract with publish and revise history
- Prisma data model for publishers, articles, revisions, and chain events
- chain-aware API routes
- event indexer worker
- shared hashing and validation utilities

Verified locally:

- shared package tests pass
- contract tests pass
- web app production build passes

Still environment-dependent at runtime:

- PostgreSQL must be running
- local Hardhat node must be running
- contract must be deployed and env values must be filled in
