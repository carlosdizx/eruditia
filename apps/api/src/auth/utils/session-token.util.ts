import { createHash, randomBytes } from 'crypto';

const TOKEN_BYTES = 32;

export const generateSessionToken = (): string =>
  randomBytes(TOKEN_BYTES).toString('base64url');

export const hashSessionToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
