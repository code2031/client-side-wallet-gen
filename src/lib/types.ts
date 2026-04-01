export interface WalletResult {
  address: string;
  privateKey: string;
  note?: string;
}

export type GeneratorType =
  | 'evm'
  | 'btc-legacy'
  | 'btc-segwit'
  | 'solana'
  | 'xrp'
  | 'tron'
  | 'cosmos'
  | 'cardano'
  | 'polkadot'
  | 'stellar'
  | 'near'
  | 'aptos'
  | 'sui'
  | 'algorand'
  | 'tezos'
  | 'ton'
  | 'monero'
  | 'filecoin'
  | 'hedera'
  | 'eos';

export interface CoinDefinition {
  id: string;
  name: string;
  symbol: string;
  generator: GeneratorType;
  params: Record<string, unknown>;
  category: string;
  color: string;
  parentChain?: string;
}
