import databaseSchema from '@common/schemas/database.schema';

const validEnv = {
  DB_HOST: 'localhost',
  DB_USERNAME: 'user',
  DB_PASSWORD: 'password',
  DB_NAME: 'eruditia',
};

describe('databaseSchema', () => {
  it('applies defaults for DB_PORT and DB_LOGGING', () => {
    expect(databaseSchema.parse(validEnv)).toEqual({
      ...validEnv,
      DB_PORT: 5432,
      DB_LOGGING: false,
    });
  });

  describe('DB_PORT', () => {
    it('coerces a numeric string to a number', () => {
      expect(
        databaseSchema.parse({ ...validEnv, DB_PORT: '3306' }).DB_PORT,
      ).toBe(3306);
    });

    it.each(['0', '-1', '1.5', 'abc'])('rejects "%s"', (port) => {
      expect(
        databaseSchema.safeParse({ ...validEnv, DB_PORT: port }).success,
      ).toBe(false);
    });
  });

  describe('DB_LOGGING', () => {
    it('transforms "true" into true', () => {
      expect(
        databaseSchema.parse({ ...validEnv, DB_LOGGING: 'true' }).DB_LOGGING,
      ).toBe(true);
    });

    it('transforms "false" into false', () => {
      expect(
        databaseSchema.parse({ ...validEnv, DB_LOGGING: 'false' }).DB_LOGGING,
      ).toBe(false);
    });

    it.each(['TRUE', '1', 'yes', ''])('rejects "%s"', (value) => {
      expect(
        databaseSchema.safeParse({ ...validEnv, DB_LOGGING: value }).success,
      ).toBe(false);
    });
  });

  it.each(Object.keys(validEnv))('rejects a missing %s', (key) => {
    const env: Record<string, string> = { ...validEnv };
    delete env[key];

    expect(databaseSchema.safeParse(env).success).toBe(false);
  });

  it.each(Object.keys(validEnv))('rejects an empty %s', (key) => {
    expect(databaseSchema.safeParse({ ...validEnv, [key]: '' }).success).toBe(
      false,
    );
  });
});
