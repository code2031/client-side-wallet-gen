# Crypto Wallet Generator

Client-side cryptocurrency wallet generator supporting 600 coins across 20+ blockchain families. All keys are generated locally in your browser using cryptographic randomness — nothing is transmitted to any server.

## Supported Cryptocurrencies (600 coins)

**Layer 1 Blockchains (50+):** ShardCoin, Bitcoin, Ethereum, Solana, XRP, Cardano, Tron, Avalanche, Polkadot, TON, NEAR, Aptos, Sui, Algorand, Tezos, Filecoin, Stellar, Hedera, Monero, EOS, Kusama, ICP, Stacks, MultiversX, Flow, Mina, Neo, Waves, Zilliqa, IOTA, Kaspa, Qtum, Conflux, Shimmer, Aleph Zero, Radix, Verus, Velas, Elastos, and more

**Bitcoin Forks (31):** Litecoin, Dogecoin, Bitcoin Cash, Dash, Zcash, DigiByte, Ravencoin, Bitcoin SV, Decred, Horizen, Syscoin, Namecoin, Vertcoin, Peercoin, Feathercoin, Viacoin, PIVX, Firo, Flux, Verge, Bitcoin Gold, Groestlcoin, MonaCoin, BlackCoin, ReddCoin, Einsteinium, Bitcore, Particl, NavCoin, and more

**EVM Chains (55+):** BNB, Polygon, Arbitrum, Optimism, Base, Fantom, Cronos, Mantle, Celo, Moonbeam, Linea, Scroll, zkSync Era, Blast, Taiko, Manta, Astar, PulseChain, Core, Merlin, ApeChain, Unichain, World Chain, Abstract, Gravity, Kroma, Immutable zkEVM, Degen L3, and many more

**Cosmos Ecosystem (36+):** ATOM, Osmosis, Injective, Sei, Celestia, dYdX, Kava, Akash, Secret, Stride, Juno, Axelar, Evmos, Stargaze, Neutron, Saga, Dymension, Archway, Nibiru, Berachain, Terra 2.0, Terra Classic, Kujira, MANTRA, Babylon, Coreum, and more

**DeFi (42+):** UNI, AAVE, MKR, LDO, SNX, COMP, CRV, 1INCH, PENDLE, EIGEN, ENA, ONDO, stETH, WBTC, SUSHI, YFI, BAL, GMX, RPL, CVX, PancakeSwap, Morpho, Velodrome, Aerodrome, Ether.fi, and many more

**Stablecoins (16):** USDT, USDC, DAI, TUSD, FRAX, PYUSD, FDUSD, LUSD, GUSD, USDD, crvUSD, GHO, USDe, USDS, EURC, EURT

**Memecoins (27):** SHIB, PEPE, FLOKI, BONK, WIF, TURBO, TRUMP, GOAT, Fartcoin, ai16z, Brett, Moo Deng, SPX6900, and many more

**Infrastructure (31):** LINK, GRT, RNDR, FET, QNT, THETA, IMX, WLD, ENS, Safe, io.net, Grass, Magic Eden, ZetaChain, and many more

**Gaming (25):** AXS, SAND, MANA, GALA, ENJ, APE, ILV, STEPN, Star Atlas, Ronin, Xai, Heroes of Mavia, and more

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
- **Print Wallet** — paper wallet with QR codes via native system print dialog
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
