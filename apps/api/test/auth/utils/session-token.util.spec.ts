import { createHash } from 'crypto';
import {
  generateSessionToken,
  hashSessionToken,
} from '@auth/utils/session-token.util';

describe('session-token.util', () => {
  describe('generateSessionToken', () => {
    it('returns a base64url string with 256 bits of entropy', () => {
      const token = generateSessionToken();

      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    });

    it('never repeats a token', () => {
      const tokens = new Set(
        Array.from({ length: 1000 }, () => generateSessionToken()),
      );

      expect(tokens.size).toBe(1000);
    });
  });

  describe('hashSessionToken', () => {
    it('returns the SHA-256 hex digest of the token', () => {
      expect(hashSessionToken('token')).toBe(
        createHash('sha256').update('token').digest('hex'),
      );
    });

    it('fits the 64-char token_hash column', () => {
      expect(hashSessionToken(generateSessionToken())).toHaveLength(64);
    });

    it('is deterministic so the hash can be used for lookups', () => {
      const token = generateSessionToken();

      expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    });
  });
});
