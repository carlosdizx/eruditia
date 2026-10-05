import smtpSchema from '@common/schemas/smtp.schema';

const validEnv = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '465',
  SMTP_USER: 'user@gmail.com',
  SMTP_PASSWORD: 'password',
};

describe('smtpSchema', () => {
  it('applies the default for SMTP_SECURE', () => {
    expect(smtpSchema.parse(validEnv)).toEqual({
      ...validEnv,
      SMTP_PORT: 465,
      SMTP_SECURE: true,
    });
  });

  describe('SMTP_PORT', () => {
    it('coerces a numeric string to a number', () => {
      expect(
        smtpSchema.parse({ ...validEnv, SMTP_PORT: '587' }).SMTP_PORT,
      ).toBe(587);
    });

    it.each(['0', '-1', '1.5', 'abc'])('rejects "%s"', (port) => {
      expect(
        smtpSchema.safeParse({ ...validEnv, SMTP_PORT: port }).success,
      ).toBe(false);
    });
  });

  describe('SMTP_SECURE', () => {
    it('transforms "true" into true', () => {
      expect(
        smtpSchema.parse({ ...validEnv, SMTP_SECURE: 'true' }).SMTP_SECURE,
      ).toBe(true);
    });

    it('transforms "false" into false', () => {
      expect(
        smtpSchema.parse({ ...validEnv, SMTP_SECURE: 'false' }).SMTP_SECURE,
      ).toBe(false);
    });

    it.each(['TRUE', '1', 'yes', ''])('rejects "%s"', (value) => {
      expect(
        smtpSchema.safeParse({ ...validEnv, SMTP_SECURE: value }).success,
      ).toBe(false);
    });
  });

  it.each(Object.keys(validEnv))('rejects a missing %s', (key) => {
    const env: Record<string, string> = { ...validEnv };
    delete env[key];

    expect(smtpSchema.safeParse(env).success).toBe(false);
  });

  it.each(Object.keys(validEnv))('rejects an empty %s', (key) => {
    expect(smtpSchema.safeParse({ ...validEnv, [key]: '' }).success).toBe(
      false,
    );
  });
});
