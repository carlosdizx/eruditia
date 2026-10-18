jest.mock('crypto', () => {
  const actual = jest.requireActual<typeof import('crypto')>('crypto');
  return { ...actual, randomInt: jest.fn(actual.randomInt) };
});

import { createHash, randomInt } from 'crypto';
import {
  generateTwoFactorCode,
  hashTwoFactorCode,
  verifyTwoFactorCode,
} from '../../../src/two-factor/utils/two-factor-code.util';

const mockedRandomInt = randomInt as unknown as jest.Mock;

describe('two-factor code utils', () => {
  describe('generateTwoFactorCode', () => {
    it('returns 6 digits', () => {
      for (let i = 0; i < 100; i++)
        expect(generateTwoFactorCode()).toMatch(/^\d{6}$/);
    });

    it('draws from the whole 000000-999999 range with a CSPRNG', () => {
      generateTwoFactorCode();

      expect(mockedRandomInt).toHaveBeenCalledWith(0, 1_000_000);
    });

    it('keeps leading zeros', () => {
      mockedRandomInt.mockReturnValueOnce(42);

      expect(generateTwoFactorCode()).toBe('000042');
    });
  });

  describe('hashTwoFactorCode', () => {
    it('is the SHA-256 hex digest of the code', () => {
      expect(hashTwoFactorCode('123456')).toBe(
        createHash('sha256').update('123456').digest('hex'),
      );
    });

    it('never contains the code itself', () => {
      expect(hashTwoFactorCode('123456')).not.toContain('123456');
    });
  });

  describe('verifyTwoFactorCode', () => {
    const hash = hashTwoFactorCode('123456');

    it('accepts the matching code', () => {
      expect(verifyTwoFactorCode('123456', hash)).toBe(true);
    });

    it('rejects a different code', () => {
      expect(verifyTwoFactorCode('123457', hash)).toBe(false);
    });

    it('rejects a malformed stored hash instead of throwing', () => {
      expect(verifyTwoFactorCode('123456', 'abc')).toBe(false);
      expect(verifyTwoFactorCode('123456', '')).toBe(false);
    });
  });
});
