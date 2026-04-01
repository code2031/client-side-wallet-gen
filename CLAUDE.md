# CLAUDE.md

## Project Overview

Client-side cryptocurrency wallet generator. Generates wallet addresses and private keys for 190 cryptocurrencies entirely in the browser. No server-side logic, no API calls during key generation.

## Tech Stack

- **Framework:** Next.js 14 (App Router) with static export
- **Language:** TypeScript (target ES2020 for BigInt support)
- **Styling:** Tailwind CSS v3
- **Crypto:** @noble/curves (secp256k1, ed25519), @noble/hashes (sha256, keccak256, blake2b, ripemd160, etc.), @scure/base (base58, bech32, base32)
- **QR Codes:** qrcode.react

## Architecture

```
src/
  lib/
    types.ts        - WalletResult, CoinDefinition, GeneratorType
    generators.ts   - 20 wallet generation algorithms (EVM, Bitcoin, Solana, Cosmos, etc.)
    coins.ts        - 190 coin definitions with generator type + params
  components/
    WalletGenerator.tsx - Single client component with all UI logic
  app/
    page.tsx        - Renders WalletGenerator
    layout.tsx      - Root layout with metadata
    globals.css     - Tailwind directives + scrollbar styling
```

## Key Design Decisions

- **All crypto runs client-side** using `crypto.getRandomValues()` (CSPRNG). No keys ever leave the browser.
- **Configuration-driven:** Each coin specifies a `generator` type and `params`. Adding a new coin is just a new entry in `coins.ts`.
- **20 generator types** cover all address derivation methods: EVM, Bitcoin Legacy/SegWit, Solana, XRP, Tron, Cosmos, Cardano, Polkadot/SS58, Stellar, Algorand, Tezos, Aptos, Sui, NEAR, Monero, Filecoin, TON, Hedera, EOS.
- **Static export** (`output: 'export'`) — can be served as plain HTML/JS from any CDN.

## Commands

```bash
npm run dev       # Dev server on port 4403
npm run build     # Production build (static export to out/)
npm run start     # Serve production build on port 4403
```

## Adding a New Coin

1. If it uses an existing address format (EVM, Bitcoin, Cosmos, etc.), just add an entry to `src/lib/coins.ts`
2. If it needs a new address derivation, add a generator function in `src/lib/generators.ts` and a new `GeneratorType` in `src/lib/types.ts`
