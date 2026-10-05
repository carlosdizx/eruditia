import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { TWO_FACTOR_CODE_LENGTH } from '../constants/two-factor.constant';

export const generateTwoFactorCode = (): string =>
  randomInt(0, 10 ** TWO_FACTOR_CODE_LENGTH)
    .toString()
    .padStart(TWO_FACTOR_CODE_LENGTH, '0');

export const hashTwoFactorCode = (code: string): string =>
  createHash('sha256').update(code).digest('hex');

export const verifyTwoFactorCode = (code: string, hash: string): boolean => {
  const expected = Buffer.from(hash, 'hex');
  const actual = Buffer.from(hashTwoFactorCode(code), 'hex');

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
