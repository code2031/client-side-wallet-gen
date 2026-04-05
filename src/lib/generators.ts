import { secp256k1 } from '@noble/curves/secp256k1';
import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { sha512_256 } from '@noble/hashes/sha512';
import { sha3_256, keccak_256 } from '@noble/hashes/sha3';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { blake2b } from '@noble/hashes/blake2b';
import { bytesToHex, concatBytes } from '@noble/hashes/utils';
import {
  base58,
  base58check as base58checkCreate,
  base58xmr,
  base58xrp,
  bech32,
  base32,
} from '@scure/base';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import type { WalletResult, GeneratorType } from './types';

type RawWallet = Omit<WalletResult, 'seedPhrase'>;

const b58check = base58checkCreate(sha256);

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

function genSeedPhrase(): string {
  return generateMnemonic(wordlist, 128);
}

function bytesToNumberLE(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

function numberToBytesLE(n: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Number(n & 0xFFn);
    n >>= 8n;
  }
  return bytes;
}

function crc16xmodem(data: Uint8Array): number {
  let crc = 0x0000;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc;
}

// ── EVM (Ethereum, BNB, Polygon, Arbitrum, etc.) ──

function generateEVM(): RawWallet {
  const privKey = randomBytes(32);
  const pubKey = secp256k1.getPublicKey(privKey, false);
  const hash = keccak_256(pubKey.slice(1));
  const addrBytes = hash.slice(-20);

  const addrHex = bytesToHex(addrBytes);
  const checksumHash = bytesToHex(keccak_256(new TextEncoder().encode(addrHex)));
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += parseInt(checksumHash[i], 16) >= 8
      ? addrHex[i].toUpperCase()
      : addrHex[i];
  }

  return { address, privateKey: '0x' + bytesToHex(privKey) };
}

// ── Bitcoin Legacy P2PKH ──

function generateBtcLegacy(params: Record<string, unknown>): RawWallet {
  const versionByte = params.versionByte as number | number[];
  const wifByte = params.wifByte as number;

  const privKey = randomBytes(32);
  const pubKey = secp256k1.getPublicKey(privKey, true);

  const hash = ripemd160(sha256(pubKey));
  const vBytes = Array.isArray(versionByte)
    ? new Uint8Array(versionByte)
    : new Uint8Array([versionByte]);
  const address = b58check.encode(concatBytes(vBytes, hash));

  const wifPayload = concatBytes(
    new Uint8Array([wifByte]),
    privKey,
    new Uint8Array([0x01]),
  );
  const privateKey = b58check.encode(wifPayload);

  return { address, privateKey };
}

// ── Bitcoin SegWit P2WPKH ──

function generateBtcSegwit(params: Record<string, unknown>): RawWallet {
  const hrp = params.hrp as string;

  const privKey = randomBytes(32);
  const pubKey = secp256k1.getPublicKey(privKey, true);

  const hash = ripemd160(sha256(pubKey));
  const words = [0, ...bech32.toWords(hash)];
  const address = bech32.encode(hrp, words);

  const wifPayload = concatBytes(
    new Uint8Array([0x80]),
    privKey,
    new Uint8Array([0x01]),
  );
  const privateKey = b58check.encode(wifPayload);

  return { address, privateKey };
}

// ── Solana ──

function generateSolana(): RawWallet {
  const seed = randomBytes(32);
  const pubKey = ed25519.getPublicKey(seed);

  return {
    address: base58.encode(pubKey),
    privateKey: base58.encode(concatBytes(seed, pubKey)),
  };
}

// ── XRP ──

function generateXRP(): RawWallet {
  const privKey = randomBytes(32);
  const pubKey = secp256k1.getPublicKey(privKey, true);

  const accountId = ripemd160(sha256(pubKey));
  const payload = concatBytes(new Uint8Array([0x00]), accountId);
  const checksum = sha256(sha256(payload)).slice(0, 4);
  const address = base58xrp.encode(concatBytes(payload, checksum));

  return { address, privateKey: bytesToHex(privKey) };
}

// ── Tron ──

function generateTron(): RawWallet {
  const privKey = randomBytes(32);
  const pubKey = secp256k1.getPublicKey(privKey, false);
  const hash = keccak_256(pubKey.slice(1));
  const addrBytes = hash.slice(-20);

  const payload = concatBytes(new Uint8Array([0x41]), addrBytes);
  const address = b58check.encode(payload);

  return { address, privateKey: bytesToHex(privKey) };
}

// ── Cosmos (ATOM, OSMO, INJ, SEI, TIA, etc.) ──

function generateCosmos(params: Record<string, unknown>): RawWallet {
  const prefix = params.prefix as string;

  const privKey = randomBytes(32);
  const pubKey = secp256k1.getPublicKey(privKey, true);

  const hash = ripemd160(sha256(pubKey));
  const words = bech32.toWords(hash);
  const address = bech32.encode(prefix, words);

  return { address, privateKey: bytesToHex(privKey) };
}

// ── Cardano (enterprise address) ──

function generateCardano(): RawWallet {
  const seed = randomBytes(32);
  const pubKey = ed25519.getPublicKey(seed);

  const keyHash = blake2b(pubKey, { dkLen: 28 });
  const header = new Uint8Array([0x61]);
  const addrBytes = concatBytes(header, keyHash);
  const words = bech32.toWords(addrBytes);
  const address = bech32.encode('addr', words, 110);

  return {
    address,
    privateKey: bytesToHex(seed),
    note: 'Enterprise address (no staking). Import seed into a Cardano wallet for full features.',
  };
}

// ── Polkadot / Kusama (SS58) ──

function generatePolkadot(params: Record<string, unknown>): RawWallet {
  const networkId = params.networkId as number;

  const seed = randomBytes(32);
  const pubKey = ed25519.getPublicKey(seed);

  const SS58_PREFIX = new TextEncoder().encode('SS58PRE');

  let prefixBytes: Uint8Array;
  if (networkId < 64) {
    prefixBytes = new Uint8Array([networkId]);
  } else {
    const first = ((networkId & 0xfc) >> 2) | 0x40;
    const second = (networkId >> 8) | ((networkId & 0x03) << 6);
    prefixBytes = new Uint8Array([first, second]);
  }

  const payload = concatBytes(prefixBytes, pubKey);
  const hashInput = concatBytes(SS58_PREFIX, payload);
  const checksum = blake2b(hashInput, { dkLen: 64 }).slice(0, 2);
  const address = base58.encode(concatBytes(payload, checksum));

  return { address, privateKey: '0x' + bytesToHex(seed) };
}

// ── Stellar ──

function generateStellar(): RawWallet {
  const seed = randomBytes(32);
  const pubKey = ed25519.getPublicKey(seed);

  const pubVersion = new Uint8Array([6 << 3]);
  const pubPayload = concatBytes(pubVersion, pubKey);
  const pubCrc = crc16xmodem(pubPayload);
  const pubCrcBytes = new Uint8Array([pubCrc & 0xff, (pubCrc >> 8) & 0xff]);
  const address = base32.encode(concatBytes(pubPayload, pubCrcBytes)).replace(/=/g, '');

  const secVersion = new Uint8Array([18 << 3]);
  const secPayload = concatBytes(secVersion, seed);
  const secCrc = crc16xmodem(secPayload);
  const secCrcBytes = new Uint8Array([secCrc & 0xff, (secCrc >> 8) & 0xff]);
  const privateKey = base32.encode(concatBytes(secPayload, secCrcBytes)).replace(/=/g, '');

  return { address, privateKey };
}

// ── NEAR ──

function generateNear(): RawWallet {
  const seed = randomBytes(32);
  const pubKey = ed25519.getPublicKey(seed);

  return {
    address: bytesToHex(pubKey),
    privateKey: 'ed25519:' + base58.encode(concatBytes(seed, pubKey)),
  };
}

// ── Aptos ──

function generateAptos(): RawWallet {
  const seed = randomBytes(32);
  const pubKey = ed25519.getPublicKey(seed);

  const input = concatBytes(pubKey, new Uint8Array([0x00]));
  const hash = sha3_256(input);
  const address = '0x' + bytesToHex(hash);

  return { address, privateKey: '0x' + bytesToHex(seed) };
}

// ── Sui ──

function generateSui(): RawWallet {
  const seed = randomBytes(32);
  const pubKey = ed25519.getPublicKey(seed);

  const input = concatBytes(new Uint8Array([0x00]), pubKey);
  const hash = blake2b(input, { dkLen: 32 });
  const address = '0x' + bytesToHex(hash);

  return { address, privateKey: '0x' + bytesToHex(seed) };
}

// ── Algorand ──

function generateAlgorand(): RawWallet {
  const seed = randomBytes(32);
  const pubKey = ed25519.getPublicKey(seed);

  const hash = sha512_256(pubKey);
  const checksum = hash.slice(-4);
  const address = base32.encode(concatBytes(pubKey, checksum)).replace(/=/g, '');

  return { address, privateKey: bytesToHex(seed) };
}

// ── Tezos ──

function generateTezos(): RawWallet {
  const seed = randomBytes(32);
  const pubKey = ed25519.getPublicKey(seed);

  const hash = blake2b(pubKey, { dkLen: 20 });
  const tz1Prefix = new Uint8Array([6, 161, 159]);
  const address = b58check.encode(concatBytes(tz1Prefix, hash));

  const edskPrefix = new Uint8Array([13, 15, 58, 7]);
  const privateKey = b58check.encode(concatBytes(edskPrefix, seed));

  return { address, privateKey };
}

// ── Monero ──

function generateMonero(): RawWallet {
  const L = ed25519.CURVE.n;
  const G = ed25519.ExtendedPoint.BASE;

  const spendSeed = randomBytes(32);
  let spendScalar = bytesToNumberLE(spendSeed) % L;
  if (spendScalar === 0n) spendScalar = 1n;

  const spendPub = G.multiply(spendScalar).toRawBytes();
  const spendPrivBytes = numberToBytesLE(spendScalar, 32);

  const viewHash = keccak_256(spendPrivBytes);
  let viewScalar = bytesToNumberLE(viewHash) % L;
  if (viewScalar === 0n) viewScalar = 1n;

  const viewPub = G.multiply(viewScalar).toRawBytes();

  const prefix = new Uint8Array([0x12]);
  const data = concatBytes(prefix, spendPub, viewPub);
  const checksum = keccak_256(data).slice(0, 4);
  const address = base58xmr.encode(concatBytes(data, checksum));

  return {
    address,
    privateKey: bytesToHex(spendPrivBytes),
    note: 'Private spend key shown. View key is derived from it.',
  };
}

// ── Filecoin (f1 secp256k1) ──

function generateFilecoin(): RawWallet {
  const privKey = randomBytes(32);
  const pubKey = secp256k1.getPublicKey(privKey, false);

  const payload = blake2b(pubKey, { dkLen: 20 });
  const checksumInput = concatBytes(new Uint8Array([1]), payload);
  const checksum = blake2b(checksumInput, { dkLen: 4 });
  const encoded = base32.encode(concatBytes(payload, checksum)).toLowerCase().replace(/=/g, '');
  const address = 'f1' + encoded;

  return { address, privateKey: bytesToHex(privKey) };
}

// ── TON (key pair only) ──

function generateTON(): RawWallet {
  const seed = randomBytes(32);
  const pubKey = ed25519.getPublicKey(seed);

  return {
    address: bytesToHex(pubKey),
    privateKey: bytesToHex(seed),
    note: 'TON requires wallet contract deployment. Use a TON wallet to derive the full address from this key.',
  };
}

// ── Hedera (key pair only) ──

function generateHedera(): RawWallet {
  const seed = randomBytes(32);
  const pubKey = ed25519.getPublicKey(seed);

  return {
    address: bytesToHex(pubKey),
    privateKey: bytesToHex(seed),
    note: 'Hedera accounts (0.0.XXXXX) require on-chain creation. Use this Ed25519 key pair with a Hedera wallet.',
  };
}

// ── EOS (key pair) ──

function generateEOS(): RawWallet {
  const privKey = randomBytes(32);
  const pubKey = secp256k1.getPublicKey(privKey, true);

  const hash = ripemd160(pubKey);
  const checkBytes = hash.slice(0, 4);
  const address = 'EOS' + base58.encode(concatBytes(pubKey, checkBytes));

  const wifPayload = concatBytes(new Uint8Array([0x80]), privKey);
  const privateKey = b58check.encode(wifPayload);

  return {
    address,
    privateKey,
    note: 'EOS accounts require on-chain registration. This shows the public key in EOS format.',
  };
}

// ── Main dispatcher ──

function generateRaw(
  generator: GeneratorType,
  params: Record<string, unknown>,
): Omit<WalletResult, 'seedPhrase'> {
  switch (generator) {
    case 'evm': return generateEVM();
    case 'btc-legacy': return generateBtcLegacy(params);
    case 'btc-segwit': return generateBtcSegwit(params);
    case 'solana': return generateSolana();
    case 'xrp': return generateXRP();
    case 'tron': return generateTron();
    case 'cosmos': return generateCosmos(params);
    case 'cardano': return generateCardano();
    case 'polkadot': return generatePolkadot(params);
    case 'stellar': return generateStellar();
    case 'near': return generateNear();
    case 'aptos': return generateAptos();
    case 'sui': return generateSui();
    case 'algorand': return generateAlgorand();
    case 'tezos': return generateTezos();
    case 'ton': return generateTON();
    case 'monero': return generateMonero();
    case 'filecoin': return generateFilecoin();
    case 'hedera': return generateHedera();
    case 'eos': return generateEOS();
    default: throw new Error(`Unknown generator: ${generator}`);
  }
}

export function generateWallet(
  generator: GeneratorType,
  params: Record<string, unknown>,
): WalletResult {
  const raw = generateRaw(generator, params);
  return { ...raw, seedPhrase: genSeedPhrase() };
}
