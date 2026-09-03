import * as crypto from 'node:crypto';

import { generateRecoveryCodes, generateSecret, verifyTOTP } from '../totp';

describe('utils/totp', () => {
  describe('generateSecret', () => {
    it('generates a base32 secret of the requested length', () => {
      const secret = generateSecret(16);
      expect(secret).toHaveLength(16);
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it('uses default length of 16 when not specified', () => {
      const secret = generateSecret();
      expect(secret).toHaveLength(16);
    });
  });

  describe('generateRecoveryCodes', () => {
    it('generates the specified count of uppercase hex recovery codes', () => {
      const codes = generateRecoveryCodes(8);
      expect(codes).toHaveLength(8);
      for (const code of codes) {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[0-9A-F]{8}$/);
      }
    });
  });

  describe('verifyTOTP', () => {
    // Helper to calculate a valid TOTP token for a given base32 secret
    function getValidToken(base32Secret: string): string {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      const clean = base32Secret.toUpperCase().replace(/=+$/, '');
      let bits = 0;
      let value = 0;
      const bytes: number[] = [];

      for (let i = 0; i < clean.length; i++) {
        const idx = alphabet.indexOf(clean[i]!);
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
          bytes.push((value >> (bits - 8)) & 255);
          bits -= 8;
        }
      }
      const key = Buffer.from(bytes);
      const counter = Math.floor(Math.floor(Date.now() / 1000) / 30);
      const buffer = Buffer.alloc(8);
      buffer.writeUInt32BE(0, 0);
      buffer.writeUInt32BE(counter, 4);

      const hmac = crypto.createHmac('sha1', key);
      hmac.update(buffer);
      const hash = hmac.digest();
      const offset = hash[hash.length - 1]! & 0xf;
      const code =
        ((hash[offset]! & 0x7f) << 24) |
        ((hash[offset + 1]! & 0xff) << 16) |
        ((hash[offset + 2]! & 0xff) << 8) |
        (hash[offset + 3]! & 0xff);

      return (code % 1000000).toString().padStart(6, '0');
    }

    it('returns true for a valid TOTP token', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const validToken = getValidToken(secret);
      expect(verifyTOTP(secret, validToken)).toBe(true);
    });

    it('returns false for an incorrect token', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      expect(verifyTOTP(secret, '000000')).toBe(false);
    });

    it('returns false for an invalid base32 secret', () => {
      expect(verifyTOTP('INVALID_BASE32!!!', '123456')).toBe(false);
    });
  });
});
