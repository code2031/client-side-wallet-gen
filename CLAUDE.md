# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Dev server on port 4403, bound to 0.0.0.0
npm run build     # Production build (static export to out/)
npm run start     # Serve production build on port 4403, bound to 0.0.0.0
npm test          # Run vitest (26 tests: address format validation, uniqueness, randomness)
npm run test:watch # Vitest in watch mode
```

No linter is configured. TypeScript checking happens during `npm run build`.

## Architecture

Client-side cryptocurrency wallet generator for 1000 coins (all IDs unique, verified by test). **Zero server-side logic** — Next.js is configured with `output: 'export'` for static HTML/JS only. All crypto runs in the browser via `crypto.getRandomValues()`.

### Three-layer design

1. **`src/lib/generators.ts`** — 20 wallet generation algorithms. Each takes optional params and returns `{ address, privateKey, note? }`. The `generateWallet(generator, params)` dispatcher routes by `GeneratorType` string.

2. **`src/lib/coins.ts`** — 504 coin definitions. Each coin declares which generator to use and what params to pass. This is the only file that changes when adding a supported coin.

3. **`src/components/WalletGenerator.tsx`** — Single `'use client'` component (~700 lines) containing all UI state and rendering. Sub-components `CoinCard` and `WalletField` are defined in the same file.

### Generator dispatch pattern

Coins reference generators by type string + params. Examples:
- EVM coins: `generator: 'evm', params: {}` — all EVM chains share one generator
- Cosmos coins: `generator: 'cosmos', params: { prefix: 'cosmos' }` — prefix varies per chain
- Bitcoin forks: `generator: 'btc-legacy', params: { versionByte: 0x30, wifByte: 0xb0 }` — version bytes vary; some use arrays like `[0x1c, 0xb8]` for 2-byte prefixes (Zcash, Decred)
- ShardCoin: `generator: 'btc-legacy', params: { versionByte: 0x3f, wifByte: 0xbf }` — P2PKH addresses start with 'S'

### Crypto libraries

All from the audited @paulmillr ecosystem:
- `@noble/curves` — secp256k1 (ECDSA, Schnorr) and ed25519 point operations
- `@noble/hashes` — sha256, sha512_256, sha3_256, keccak_256, ripemd160, blake2b
- `@scure/base` — base58, base58check (factory taking sha256), base58xrp, base58xmr, bech32, base32

### TypeScript target

`tsconfig.json` sets `target: "es2020"` — required because Monero key generation uses BigInt literals (`0n`, `8n`). Path alias: `@/*` → `./src/*`.

### Print wallet feature

Print uses `@media print` CSS with a `.print-overlay` div rendered inline (hidden on screen, shown only during print). Setting `printData` state triggers `window.print()` via useEffect. QR codes are rendered with the already-loaded `qrcode.react` — no external CDN needed, no new window opened. No keys are sent to any server.

## Adding a New Coin

**Existing address format (most cases):** Add one entry to `src/lib/coins.ts`:
```typescript
{ id: 'xyz', name: 'NewCoin', symbol: 'XYZ', generator: 'evm', params: {}, category: 'EVM Chain', color: '#HEXCOLOR', parentChain: 'Ethereum' }
```

**New address format:** Four changes needed:
1. Add variant to `GeneratorType` union in `src/lib/types.ts`
2. Implement generator function in `src/lib/generators.ts` (must return `WalletResult`)
3. Add case to the `generateWallet` switch in `src/lib/generators.ts`
4. Add coin entry to `src/lib/coins.ts` referencing the new generator

## Security constraints

- Keys must NEVER be transmitted, stored, or logged — they exist only in React useState (browser memory)
- No fetch calls, no localStorage, no cookies, no API routes
- Clipboard uses fallback (`execCommand('copy')`) for non-HTTPS contexts where `navigator.clipboard` is unavailable
- The `next.config.js` `output: 'export'` setting must stay — it ensures no server-side code exists in production
