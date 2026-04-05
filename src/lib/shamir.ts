// Shamir's Secret Sharing over GF(256)
// Uses irreducible polynomial x^8 + x^4 + x^3 + x + 1 (0x11B)

const EXP = new Uint8Array(256);
const LOG = new Uint8Array(256);

let x = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x = ((x << 1) ^ (x & 0x80 ? 0x1b : 0)) & 0xff;
}
EXP[255] = EXP[0];

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[(LOG[a] + LOG[b]) % 255];
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  if (a === 0) return 0;
  return EXP[(LOG[a] - LOG[b] + 255) % 255];
}

export function splitSecret(
  secret: Uint8Array,
  numShares: number,
  threshold: number,
): Uint8Array[] {
  if (threshold > numShares) throw new Error('Threshold must be <= numShares');
  if (threshold < 2) throw new Error('Threshold must be >= 2');
  if (numShares > 255) throw new Error('Max 255 shares');

  const shares: Uint8Array[] = [];
  for (let i = 0; i < numShares; i++) {
    const share = new Uint8Array(secret.length + 1);
    share[0] = i + 1; // x-coordinate (1-indexed)
    shares.push(share);
  }

  for (let b = 0; b < secret.length; b++) {
    const coeffs = new Uint8Array(threshold);
    coeffs[0] = secret[b];
    crypto.getRandomValues(coeffs.subarray(1));

    for (let i = 0; i < numShares; i++) {
      const xi = i + 1;
      let y = 0;
      for (let j = threshold - 1; j >= 0; j--) {
        y = coeffs[j] ^ gfMul(y, xi);
      }
      shares[i][b + 1] = y;
    }
  }

  return shares;
}

export function combineShares(shares: Uint8Array[]): Uint8Array {
  if (shares.length < 2) throw new Error('Need at least 2 shares');
  const secretLen = shares[0].length - 1;
  const result = new Uint8Array(secretLen);

  for (let b = 0; b < secretLen; b++) {
    let val = 0;
    for (let i = 0; i < shares.length; i++) {
      const xi = shares[i][0];
      const yi = shares[i][b + 1];
      let basis = 1;
      for (let j = 0; j < shares.length; j++) {
        if (i === j) continue;
        const xj = shares[j][0];
        basis = gfMul(basis, gfDiv(xj, xi ^ xj));
      }
      val ^= gfMul(yi, basis);
    }
    result[b] = val;
  }

  return result;
}

export function shareToHex(share: Uint8Array): string {
  return Array.from(share)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToShare(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
