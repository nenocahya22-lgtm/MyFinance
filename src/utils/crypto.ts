/**
 * Pure TypeScript synchronous SHA-256 hashing helper
 * Used for secure, zero-dependency client-side and server-side PIN hashing and matching.
 */
export function hashSHA256(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const lengthProperty = 'length';
  const asciiLength = ascii[lengthProperty];
  const words: number[] = [];
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const HASH: number[] = hash.slice();
  const charCodes: number[] = [];
  
  for (let c = 0; c < ascii.length; c++) {
    charCodes.push(ascii.charCodeAt(c));
  }
  
  // Pad the input
  charCodes.push(0x80);
  while ((charCodes.length * 8) % 512 !== 448) {
    charCodes.push(0);
  }
  
  // Append length in bits as a 64-bit integer
  const bitsLength = asciiLength * 8;
  const hexLen = bitsLength.toString(16).padStart(16, '0');
  for (let b = 0; b < 8; b++) {
    charCodes.push(parseInt(hexLen.substring(b * 2, b * 2 + 2), 16));
  }
  
  // Convert charCodes to 32-bit words
  const totalWords = charCodes.length / 4;
  for (let w = 0; w < totalWords; w++) {
    const word = 
      (charCodes[w * 4] << 24) | 
      (charCodes[w * 4 + 1] << 16) | 
      (charCodes[w * 4 + 2] << 8) | 
      charCodes[w * 4 + 3];
    words.push(word);
  }
  
  // Main SHA-256 loop
  for (let blockIndex = 0; blockIndex < words.length; blockIndex += 16) {
    const wSchedule = new Array(64);
    for (let t = 0; t < 16; t++) {
      wSchedule[t] = words[blockIndex + t];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(wSchedule[t - 15], 7) ^ rightRotate(wSchedule[t - 15], 18) ^ (wSchedule[t - 15] >>> 3);
      const s1 = rightRotate(wSchedule[t - 2], 17) ^ rightRotate(wSchedule[t - 2], 19) ^ (wSchedule[t - 2] >>> 10);
      wSchedule[t] = (wSchedule[t - 16] + s0 + wSchedule[t - 7] + s1) | 0;
    }
    
    let a = HASH[0];
    let b = HASH[1];
    let c = HASH[2];
    let d = HASH[3];
    let e = HASH[4];
    let f = HASH[5];
    let g = HASH[6];
    let h = HASH[7];
    
    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[t] + wSchedule[t]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    HASH[0] = (HASH[0] + a) | 0;
    HASH[1] = (HASH[1] + b) | 0;
    HASH[2] = (HASH[2] + c) | 0;
    HASH[3] = (HASH[3] + d) | 0;
    HASH[4] = (HASH[4] + e) | 0;
    HASH[5] = (HASH[5] + f) | 0;
    HASH[6] = (HASH[6] + g) | 0;
    HASH[7] = (HASH[7] + h) | 0;
  }
  
  return HASH.map(word => {
    const hex = (word >>> 0).toString(16);
    return hex.padStart(8, '0');
  }).join('');
}
