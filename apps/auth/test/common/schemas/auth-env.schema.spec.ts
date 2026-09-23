import authEnvSchema from '@common/schemas/auth-env.schema';

const validEnv = {
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
};

describe('authEnvSchema', () => {
  it('applies the default empty TRUSTED_ORIGINS', () => {
    expect(authEnvSchema.parse(validEnv)).toEqual({
      ...validEnv,
      TRUSTED_ORIGINS: [],
    });
  });

  describe('BETTER_AUTH_SECRET', () => {
    it('rejects a secret shorter than 32 characters', () => {
      expect(
        authEnvSchema.safeParse({ ...validEnv, BETTER_AUTH_SECRET: 'short' })
          .success,
      ).toBe(false);
    });
  });

  describe('BETTER_AUTH_URL', () => {
    it('rejects a non-URL value', () => {
      expect(
        authEnvSchema.safeParse({ ...validEnv, BETTER_AUTH_URL: 'not-a-url' })
          .success,
      ).toBe(false);
    });
  });

  describe('TRUSTED_ORIGINS', () => {
    it('splits a comma-separated list and trims whitespace', () => {
      expect(
        authEnvSchema.parse({
          ...validEnv,
          TRUSTED_ORIGINS: ' https://a.test , https://b.test ',
        }).TRUSTED_ORIGINS,
      ).toEqual(['https://a.test', 'https://b.test']);
    });

    it('ignores empty entries', () => {
      expect(
        authEnvSchema.parse({
          ...validEnv,
          TRUSTED_ORIGINS: 'https://a.test,,',
        }).TRUSTED_ORIGINS,
      ).toEqual(['https://a.test']);
    });

    it('defaults to an empty array when omitted', () => {
      expect(authEnvSchema.parse(validEnv).TRUSTED_ORIGINS).toEqual([]);
    });
  });

  it.each(['BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'])(
    'rejects a missing %s',
    (key) => {
      const env: Record<string, string> = { ...validEnv };
      delete env[key];

      expect(authEnvSchema.safeParse(env).success).toBe(false);
    },
  );
});
