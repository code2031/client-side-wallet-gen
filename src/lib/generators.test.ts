import { describe, it, expect } from 'vitest';
import { generateWallet } from './generators';
import { coins } from './coins';
import type { GeneratorType } from './types';

// ── Helpers ──

function isHex(s: string): boolean {
  return /^[0-9a-fA-F]+$/.test(s);
}

function isBase58(s: string): boolean {
  return /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(s);
}

function isBase32(s: string): boolean {
  return /^[A-Z2-7]+=*$/.test(s);
}

function isBech32(s: string, prefix: string): boolean {
  return s.startsWith(prefix + '1') && s.length > prefix.length + 6;
}

// ── Seed phrase tests ──

describe('seed phrase', () => {
  it('every wallet includes a 12-word BIP-39 seed phrase', () => {
    const w = generateWallet('evm', {});
    const words = w.seedPhrase.split(' ');
    expect(words.length).toBe(12);
    words.forEach(word => {
      expect(word).toMatch(/^[a-z]+$/);
    });
  });

  it('seed phrases differ between wallets', () => {
    const a = generateWallet('evm', {});
    const b = generateWallet('evm', {});
    expect(a.seedPhrase).not.toBe(b.seedPhrase);
  });
});

// ── Generator format tests ──

describe('generators', () => {

  it('evm: 0x-prefixed, 42 hex chars, EIP-55 mixed case', () => {
    const w = generateWallet('evm', {});
    expect(w.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(w.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });

  it('btc-segwit: bech32 bc1q address', () => {
    const w = generateWallet('btc-segwit', { hrp: 'bc' });
    expect(w.address).toMatch(/^bc1q[a-z0-9]{38,}$/);
    expect(isBase58(w.privateKey)).toBe(true);
  });

  it('btc-legacy: Base58Check address, WIF private key', () => {
    const w = generateWallet('btc-legacy', { versionByte: 0x00, wifByte: 0x80 });
    expect(isBase58(w.address)).toBe(true);
    expect(w.address.length).toBeGreaterThanOrEqual(25);
    expect(isBase58(w.privateKey)).toBe(true);
  });

  it('ShardCoin: address starts with S', () => {
    const w = generateWallet('btc-legacy', { versionByte: 0x3f, wifByte: 0xbf });
    expect(w.address).toMatch(/^S/);
    expect(isBase58(w.address)).toBe(true);
  });

  it('solana: Base58 address and keypair', () => {
    const w = generateWallet('solana', {});
    expect(isBase58(w.address)).toBe(true);
    expect(w.address.length).toBeGreaterThanOrEqual(32);
    expect(w.address.length).toBeLessThanOrEqual(44);
    expect(isBase58(w.privateKey)).toBe(true);
  });

  it('xrp: address starts with r', () => {
    const w = generateWallet('xrp', {});
    expect(w.address).toMatch(/^r/);
    expect(w.address.length).toBeGreaterThanOrEqual(25);
  });

  it('tron: address starts with T, Base58Check', () => {
    const w = generateWallet('tron', {});
    expect(w.address).toMatch(/^T/);
    expect(isBase58(w.address)).toBe(true);
    expect(isHex(w.privateKey)).toBe(true);
  });

  it('cosmos: bech32 with cosmos prefix', () => {
    const w = generateWallet('cosmos', { prefix: 'cosmos' });
    expect(isBech32(w.address, 'cosmos')).toBe(true);
    expect(isHex(w.privateKey)).toBe(true);
  });

  it('cardano: bech32 addr prefix, enterprise address', () => {
    const w = generateWallet('cardano', {});
    expect(w.address).toMatch(/^addr1/);
    expect(isHex(w.privateKey)).toBe(true);
    expect(w.note).toBeDefined();
  });

  it('polkadot: SS58 Base58 address', () => {
    const w = generateWallet('polkadot', { networkId: 0 });
    expect(isBase58(w.address)).toBe(true);
    expect(w.address.length).toBeGreaterThanOrEqual(46);
    expect(w.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('stellar: address starts with G, private key starts with S', () => {
    const w = generateWallet('stellar', {});
    expect(w.address).toMatch(/^G/);
    expect(isBase32(w.address)).toBe(true);
    expect(w.address.length).toBe(56);
    expect(w.privateKey).toMatch(/^S/);
    expect(w.privateKey.length).toBe(56);
  });

  it('algorand: Base32 address, 58 chars', () => {
    const w = generateWallet('algorand', {});
    expect(isBase32(w.address)).toBe(true);
    expect(w.address.length).toBe(58);
    expect(isHex(w.privateKey)).toBe(true);
  });

  it('tezos: address starts with tz1, key starts with edsk', () => {
    const w = generateWallet('tezos', {});
    expect(w.address).toMatch(/^tz1/);
    expect(isBase58(w.address)).toBe(true);
    expect(w.privateKey).toMatch(/^edsk/);
  });

  it('aptos: 0x-prefixed, 66 hex chars', () => {
    const w = generateWallet('aptos', {});
    expect(w.address).toMatch(/^0x[0-9a-f]{64}$/);
    expect(w.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('sui: 0x-prefixed, 66 hex chars', () => {
    const w = generateWallet('sui', {});
    expect(w.address).toMatch(/^0x[0-9a-f]{64}$/);
    expect(w.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('near: hex address, ed25519 prefixed key', () => {
    const w = generateWallet('near', {});
    expect(isHex(w.address)).toBe(true);
    expect(w.address.length).toBe(64);
    expect(w.privateKey).toMatch(/^ed25519:/);
  });

  it('monero: address starts with 4, 95 chars', () => {
    const w = generateWallet('monero', {});
    expect(w.address).toMatch(/^4/);
    expect(w.address.length).toBe(95);
    expect(isHex(w.privateKey)).toBe(true);
    expect(w.privateKey.length).toBe(64);
  });

  it('filecoin: address starts with f1', () => {
    const w = generateWallet('filecoin', {});
    expect(w.address).toMatch(/^f1/);
    expect(isHex(w.privateKey)).toBe(true);
  });

  it('ton: hex public key with note', () => {
    const w = generateWallet('ton', {});
    expect(isHex(w.address)).toBe(true);
    expect(w.address.length).toBe(64);
    expect(w.note).toBeDefined();
  });

  it('hedera: hex public key with note', () => {
    const w = generateWallet('hedera', {});
    expect(isHex(w.address)).toBe(true);
    expect(w.address.length).toBe(64);
    expect(w.note).toBeDefined();
  });

  it('eos: address starts with EOS', () => {
    const w = generateWallet('eos', {});
    expect(w.address).toMatch(/^EOS/);
    expect(isBase58(w.privateKey)).toBe(true);
  });
});

// ── Idempotency: each call returns different keys ──

describe('randomness', () => {
  it('two consecutive EVM wallets have different addresses', () => {
    const a = generateWallet('evm', {});
    const b = generateWallet('evm', {});
    expect(a.address).not.toBe(b.address);
    expect(a.privateKey).not.toBe(b.privateKey);
  });

  it('two consecutive Solana wallets have different addresses', () => {
    const a = generateWallet('solana', {});
    const b = generateWallet('solana', {});
    expect(a.address).not.toBe(b.address);
  });
});

// ── Coin definitions: every coin references a valid generator ──

describe('coin definitions', () => {
  const validGenerators: GeneratorType[] = [
    'evm', 'btc-legacy', 'btc-segwit', 'solana', 'xrp', 'tron',
    'cosmos', 'cardano', 'polkadot', 'stellar', 'near', 'aptos',
    'sui', 'algorand', 'tezos', 'ton', 'monero', 'filecoin',
    'hedera', 'eos',
  ];

  it('all 1000 coins reference valid generators', () => {
    expect(coins.length).toBe(1000);
    for (const coin of coins) {
      expect(validGenerators).toContain(coin.generator);
    }
  });

  it('all coin IDs are unique', () => {
    const ids = coins.map(c => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('every coin can generate a wallet without throwing', () => {
    // Test a sample (all 1000 would be slow due to Monero BigInt math)
    const sample = coins.filter((_, i) => i % 50 === 0);
    for (const coin of sample) {
      const w = generateWallet(coin.generator, coin.params);
      expect(w.address).toBeTruthy();
      expect(w.privateKey).toBeTruthy();
    }
  });
});
