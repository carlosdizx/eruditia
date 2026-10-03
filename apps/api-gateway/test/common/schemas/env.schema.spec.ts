import { envSchema } from '@common/schemas/env.schema';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  LOG_LEVELS: 'log,error',
  DB_HOST: 'localhost',
  DB_USERNAME: 'user',
  DB_PASSWORD: 'password',
  DB_NAME: 'eruditia',
  OBSERVE_APP_KEY: 'key',
  OBSERVE_APP_SECRET: 'secret',
  OBSERVE_SERVICE_ID: 'service',
  SUPER_ADMIN_EMAIL: 'superadmin@example.com',
};

describe('envSchema', () => {
  it('parses a valid environment applying transforms and defaults', () => {
    expect(envSchema.parse(validEnv)).toEqual({
      ...validEnv,
      PORT: 3000,
      LOG_LEVELS: ['log', 'error'],
      DB_PORT: 5432,
      DB_LOGGING: false,
    });
  });

  describe('NODE_ENV', () => {
    it.each(['development', 'production', 'test'])('accepts "%s"', (env) => {
      expect(envSchema.parse({ ...validEnv, NODE_ENV: env }).NODE_ENV).toBe(
        env,
      );
    });

    it('rejects an unknown value', () => {
      expect(
        envSchema.safeParse({ ...validEnv, NODE_ENV: 'staging' }).success,
      ).toBe(false);
    });
  });

  describe('PORT', () => {
    it.each(['0', '-1', '1.5', 'abc'])('rejects "%s"', (port) => {
      expect(envSchema.safeParse({ ...validEnv, PORT: port }).success).toBe(
        false,
      );
    });
  });

  describe('LOG_LEVELS', () => {
    it('trims whitespace around each level', () => {
      expect(
        envSchema.parse({ ...validEnv, LOG_LEVELS: ' log , warn ' }).LOG_LEVELS,
      ).toEqual(['log', 'warn']);
    });

    it('ignores empty entries', () => {
      expect(
        envSchema.parse({ ...validEnv, LOG_LEVELS: 'log,,error,' }).LOG_LEVELS,
      ).toEqual(['log', 'error']);
    });

    it.each(['', ' , ,'])('rejects "%s" (no levels)', (levels) => {
      expect(
        envSchema.safeParse({ ...validEnv, LOG_LEVELS: levels }).success,
      ).toBe(false);
    });

    it('rejects an invalid level', () => {
      expect(
        envSchema.safeParse({ ...validEnv, LOG_LEVELS: 'log,info' }).success,
      ).toBe(false);
    });
  });

  describe('SUPER_ADMIN_EMAIL', () => {
    it('rejects a missing SUPER_ADMIN_EMAIL', () => {
      const env: Record<string, string> = { ...validEnv };
      delete env.SUPER_ADMIN_EMAIL;

      expect(envSchema.safeParse(env).success).toBe(false);
    });

    it('rejects an invalid email', () => {
      expect(
        envSchema.safeParse({ ...validEnv, SUPER_ADMIN_EMAIL: 'not-an-email' })
          .success,
      ).toBe(false);
    });
  });

  describe('composed schemas', () => {
    it.each([
      'DB_HOST',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_NAME',
      'OBSERVE_APP_KEY',
      'OBSERVE_APP_SECRET',
      'OBSERVE_SERVICE_ID',
    ])('rejects a missing %s', (key) => {
      const env: Record<string, string> = { ...validEnv };
      delete env[key];

      expect(envSchema.safeParse(env).success).toBe(false);
    });

    it('applies the database transforms', () => {
      const parsed = envSchema.parse({
        ...validEnv,
        DB_PORT: '3306',
        DB_LOGGING: 'true',
      });

      expect(parsed.DB_PORT).toBe(3306);
      expect(parsed.DB_LOGGING).toBe(true);
    });
  });
});
