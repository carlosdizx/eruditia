const mockScrypt = jest.fn();

jest.mock('node:crypto', () => {
  const actual = jest.requireActual('node:crypto');

  return {
    ...actual,
    scrypt: mockScrypt,
  };
});

import { randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword } from '@common/utils/password.util';

describe('password.util', () => {
  beforeEach(() => {
    mockScrypt.mockReset();
  });

  describe('hashPassword', () => {
    it('should generate a valid scrypt hash', async () => {
      mockScrypt.mockImplementation(
        (
          _password: string,
          _salt: Buffer,
          keyLength: number,
          _options: unknown,
          callback: (error: Error | null, derivedKey: Buffer) => void,
        ) => {
          callback(null, Buffer.alloc(keyLength, 1));
        },
      );

      const password = randomUUID();

      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');

      const [algorithm, N, r, p, salt, derivedHash] = hash.split('$');

      expect(algorithm).toBe('scrypt');
      expect(N).toBe('16384');
      expect(r).toBe('8');
      expect(p).toBe('1');
      expect(salt).toBeDefined();
      expect(derivedHash).toBeDefined();
    });

    it('should generate different hashes for the same password', async () => {
      mockScrypt.mockImplementation(
        (
          _password: string,
          salt: Buffer,
          keyLength: number,
          _options: unknown,
          callback: (error: Error | null, derivedKey: Buffer) => void,
        ) => {
          const result = Buffer.alloc(keyLength);

          salt.copy(result, 0, 0, Math.min(salt.length, keyLength));

          callback(null, result);
        },
      );

      const password = randomUUID();

      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      const hash3 = await hashPassword(password);

      expect(hash1).not.toEqual(hash2);
      expect(hash1).not.toEqual(hash3);
      expect(hash2).not.toEqual(hash3);
    });

    it('should reject when scrypt returns an error', async () => {
      mockScrypt.mockImplementation(
        (
          _password: string,
          _salt: Buffer,
          _keyLength: number,
          _options: unknown,
          callback: (error: Error | null, derivedKey: Buffer) => void,
        ) => {
          callback(new Error('Scrypt error'), Buffer.alloc(0));
        },
      );

      await expect(hashPassword(randomUUID())).rejects.toThrow('Scrypt error');
    });
  });

  describe('verifyPassword', () => {
    it('should return true when the password matches the stored hash', async () => {
      mockScrypt.mockImplementation(
        (
          password: string,
          _salt: Buffer,
          keyLength: number,
          _options: unknown,
          callback: (error: Error | null, derivedKey: Buffer) => void,
        ) => {
          const value = Buffer.alloc(keyLength);
          value.write(password);

          callback(null, value);
        },
      );

      const password = randomUUID();
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should return false when the password does not match the stored hash', async () => {
      mockScrypt.mockImplementation(
        (
          password: string,
          _salt: Buffer,
          keyLength: number,
          _options: unknown,
          callback: (error: Error | null, derivedKey: Buffer) => void,
        ) => {
          const value = Buffer.alloc(keyLength);
          value.write(password);

          callback(null, value);
        },
      );

      const password = randomUUID();
      const wrongPassword = randomUUID();

      const hash = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should return false when the stored algorithm is invalid', async () => {
      const password = randomUUID();
      const stored = 'bcrypt$16384$8$1$salt$hash';

      const isValid = await verifyPassword(password, stored);

      expect(isValid).toBe(false);
    });

    it('should return false when the stored hash is malformed', async () => {
      const password = randomUUID();

      const isValid = await verifyPassword(password, 'scrypt$16384$8$1');

      expect(isValid).toBe(false);
    });
  });
});
