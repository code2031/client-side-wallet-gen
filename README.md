# Crypto Wallet Generator

Client-side cryptocurrency wallet generator supporting 190 coins across 20 blockchain families. All keys are generated locally in your browser using cryptographic randomness — nothing is transmitted to any server.

## Supported Cryptocurrencies (190 coins)

**Layer 1 Blockchains (20):** Bitcoin, Ethereum, Solana, XRP, Cardano, Tron, Avalanche, Polkadot, TON, NEAR, Aptos, Sui, Algorand, Tezos, Filecoin, Stellar, Hedera, Monero, EOS, Kusama

**Bitcoin Forks (16):** Litecoin, Dogecoin, Bitcoin Cash, Dash, Zcash, DigiByte, Ravencoin, Bitcoin SV, Decred, Horizen, Syscoin, Namecoin, Vertcoin, Peercoin, Feathercoin, Viacoin

**EVM Chains (30):** BNB, Polygon, Arbitrum, Optimism, Base, Fantom, Cronos, Mantle, Celo, Moonbeam, Metis, Klaytn, Gnosis, Linea, Scroll, zkSync Era, Blast, Flare, VeChain, Harmony, Aurora, Boba, Moonriver, SKALE, Oasis, Zora, Mode, Taiko, Manta, Astar

**Cosmos Ecosystem (20):** ATOM, Osmosis, Injective, Sei, Celestia, dYdX, Kava, Akash, Secret, Stride, Juno, Regen, Axelar, Persistence, Sommelier, Evmos, Canto, OmniFlix, Stargaze, Neutron

**DeFi (28):** UNI, AAVE, MKR, LDO, SNX, COMP, CRV, 1INCH, PENDLE, EIGEN, ENA, ONDO, stETH, WBTC, SUSHI, YFI, BAL, GMX, RPL, CVX, BLUR, LRC, SSV, DODO, BNT, KNC, ANKR, JUP, RAY, JTO, ORCA, DRIFT, and more

**Stablecoins (12):** USDT, USDC, DAI, TUSD, FRAX, PYUSD, FDUSD, LUSD, GUSD, USDD, crvUSD, GHO

**Memecoins (14):** SHIB, PEPE, FLOKI, BONK, WIF, TURBO, MEME, NEIRO, BOME, MEW, POPCAT, MYRO, SAMO, BABYDOGE

**Infrastructure (21):** LINK, GRT, RNDR, FET, QNT, THETA, IMX, WLD, AR, OCEAN, API3, STORJ, LPT, MASK, BAT, ZRX, TRB, REQ, BAND, NMR, RLC, PYTH, TNSR, HNT, Wormhole

**Gaming (17):** AXS, SAND, MANA, GALA, ENJ, APE, ILV, STEPN, Star Atlas, GODS, YGG, MAGIC, BEAM, PRIME, SUPER, PIXEL, PORTAL

## Features

- Generates wallet address + private key for each cryptocurrency
- QR codes with full-screen modal view for addresses and private keys
- One-click copy with toast notifications (works on HTTP and HTTPS)
- Private keys hidden by default with eye-icon reveal toggle
- Search by name/symbol with `/` keyboard shortcut
- Filter by category with color-coded badges
- "Generate All" to create wallets for all visible coins at once
- Fully client-side — works offline after loading
- **Keys are never stored, transmitted, or logged** — they exist only in browser memory
- Responsive dark theme with animated transitions

## Address Generation Methods

| Method | Curve | Chains |
|--------|-------|--------|
| EVM (Keccak-256) | secp256k1 | ETH, BNB, MATIC, ARB, OP, BASE, + all ERC-20 tokens |
| Bitcoin Legacy (P2PKH) | secp256k1 | LTC, DOGE, BCH, DASH, ZEC, DGB, RVN, BSV, DCR |
| Bitcoin SegWit (Bech32) | secp256k1 | BTC |
| Solana (Base58) | Ed25519 | SOL + SPL tokens |
| XRP (Base58 Ripple) | secp256k1 | XRP |
| Tron (Base58Check) | secp256k1 | TRX |
| Cosmos (Bech32) | secp256k1 | ATOM, OSMO, INJ, SEI, TIA, DYDX, KAVA, AKT |
| Cardano (Bech32) | Ed25519 | ADA |
| Polkadot (SS58) | Ed25519 | DOT, KSM |
| Stellar (Base32) | Ed25519 | XLM |
| Algorand (Base32) | Ed25519 | ALGO |
| Tezos (Base58Check) | Ed25519 | XTZ |
| Aptos (SHA3-256) | Ed25519 | APT |
| Sui (Blake2b) | Ed25519 | SUI |
| NEAR (Hex) | Ed25519 | NEAR |
| Monero (Base58 Monero) | Ed25519 | XMR |
| Filecoin (Base32) | secp256k1 | FIL |

## Security

- Keys generated using the Web Crypto API (`crypto.getRandomValues`) — cryptographically secure random number generator
- No network requests during key generation
- No keys are stored, logged, or transmitted
- Built with audited cryptographic libraries: [@noble/curves](https://github.com/paulmillr/noble-curves), [@noble/hashes](https://github.com/paulmillr/noble-hashes), [@scure/base](https://github.com/paulmillr/scure-base)

**For cold storage:** Save this page and use it offline with your internet connection disabled.

## Getting Started

```bash
npm install
npm run dev
```

Opens on [http://localhost:4403](http://localhost:4403). Accessible from other devices on the network via `http://<your-ip>:4403`.

## Tech Stack

- Next.js 14 + React 18 + TypeScript
- Tailwind CSS
- @noble/curves & @noble/hashes (cryptographic primitives)
- @scure/base (encoding: Base58, Bech32, Base32)
- qrcode.react (QR code generation)
