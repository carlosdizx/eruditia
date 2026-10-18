import {
  randomBytes,
  scrypt,
  ScryptOptions,
  timingSafeEqual,
  randomInt,
} from 'crypto';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const OPTIONS = { N: 16384, r: 8, p: 1 };
const SAFE_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const scryptAsync = (
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });

// Formato: scrypt$N$r$p$<salt base64>$<hash base64>
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, OPTIONS);

  return [
    'scrypt',
    OPTIONS.N,
    OPTIONS.r,
    OPTIONS.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
};

export const verifyPassword = async (
  password: string,
  stored: string,
): Promise<boolean> => {
  const [algorithm, N, r, p, salt, hash] = stored.split('$');

  if (algorithm !== 'scrypt' || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'base64');
  const actual = await scryptAsync(
    password,
    Buffer.from(salt, 'base64'),
    expected.length,
    { N: Number(N), r: Number(r), p: Number(p) },
  );

  return timingSafeEqual(expected, actual);
};

const generateBlock = (length: number): string => {
  let block = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = randomInt(0, SAFE_ALPHABET.length);
    block += SAFE_ALPHABET[randomIndex];
  }
  return block;
};

export const generateFriendlyPassword = (
  blocks: number = 3,
  blockSize: number = 4,
): string => {
  const passwordParts: string[] = [];

  for (let i = 0; i < blocks; i++) {
    passwordParts.push(generateBlock(blockSize));
  }

  return passwordParts.join('-');
};
