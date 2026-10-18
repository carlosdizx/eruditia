import validateEnv from '@common/config/env.config';

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
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '465',
  SMTP_USER: 'user@gmail.com',
  SMTP_PASSWORD: 'password',
};

describe('validateEnv', () => {
  it('returns the parsed environment when it is valid', () => {
    expect(validateEnv(validEnv)).toEqual({
      ...validEnv,
      PORT: 3000,
      LOG_LEVELS: ['log', 'error'],
      DB_PORT: 5432,
      DB_LOGGING: false,
      SMTP_PORT: 465,
      SMTP_SECURE: true,
      SESSION_TTL_HOURS: 24,
      SESSION_IDLE_TIMEOUT_MINUTES: 120,
    });
  });

  it('throws an error when the environment is invalid', () => {
    expect(() => validateEnv({})).toThrow('Invalid environment variables:');
  });

  it('lists the path of every invalid variable', () => {
    let message = '';

    try {
      validateEnv({ ...validEnv, NODE_ENV: 'staging', DB_HOST: '' });
    } catch (error) {
      message = (error as Error).message;
    }

    const lines = message.split('\n');

    expect(lines[0]).toBe('Invalid environment variables:');
    expect(lines).toHaveLength(3);
    expect(message).toMatch(/^ {2}- NODE_ENV: .+$/m);
    expect(message).toMatch(/^ {2}- DB_HOST: .+$/m);
  });

  it('reports a missing variable', () => {
    const env: Record<string, string> = { ...validEnv };
    delete env.PORT;

    expect(() => validateEnv(env)).toThrow(/^ {2}- PORT: .+$/m);
  });
});
