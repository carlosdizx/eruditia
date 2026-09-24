import * as schema from '@database/schema';

jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('better-auth', () => ({ betterAuth: jest.fn() }));
jest.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: jest.fn(),
}));
jest.mock('@database/config/database-connection.factory', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@auth/plugins/admin.plugin', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@auth/plugins/organization.plugin', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@auth/hooks/assign-active-organization.hook', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const validEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  LOG_LEVELS: 'log,error',
  DB_HOST: 'localhost',
  DB_USERNAME: 'user',
  DB_PASSWORD: 'password',
  DB_NAME: 'eruditia',
  OBSERVE_APP_KEY: 'key',
  OBSERVE_APP_SECRET: 'secret',
  OBSERVE_SERVICE_ID: 'service',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  TRUSTED_ORIGINS: 'http://localhost:4200, http://localhost:5173',
};

const db = { name: 'db' };
const adapter = { name: 'adapter' };
const authInstance = { name: 'auth' };
const adminPluginInstance = { id: 'admin' };
const organizationPluginInstance = { id: 'organization' };
const sessionCreateHook = jest.fn();

interface Mocks {
  dotenvConfig: jest.Mock;
  betterAuth: jest.Mock;
  drizzleAdapter: jest.Mock;
  createDrizzleConnection: jest.Mock;
  adminPlugin: jest.Mock;
  organizationPlugin: jest.Mock;
  assignActiveOrganizationHook: jest.Mock;
}

// auth.config runs everything at import time, so each test loads it in a
// fresh module registry. The mocks are required from that same registry so
// they are the instances auth.config actually sees.
const loadAuthConfig = (setup?: (mocks: Mocks) => void) => {
  const mocks = {} as Mocks;
  let auth: unknown;
  let error: unknown;

  jest.isolateModules(() => {
    mocks.dotenvConfig = jest.requireMock<{ config: jest.Mock }>(
      'dotenv',
    ).config;
    mocks.betterAuth = jest.requireMock<{ betterAuth: jest.Mock }>(
      'better-auth',
    ).betterAuth;
    mocks.drizzleAdapter = jest.requireMock<{ drizzleAdapter: jest.Mock }>(
      'better-auth/adapters/drizzle',
    ).drizzleAdapter;
    mocks.createDrizzleConnection = jest.requireMock<{ default: jest.Mock }>(
      '@database/config/database-connection.factory',
    ).default;
    mocks.adminPlugin = jest.requireMock<{ default: jest.Mock }>(
      '@auth/plugins/admin.plugin',
    ).default;
    mocks.organizationPlugin = jest.requireMock<{ default: jest.Mock }>(
      '@auth/plugins/organization.plugin',
    ).default;
    mocks.assignActiveOrganizationHook = jest.requireMock<{
      default: jest.Mock;
    }>('@auth/hooks/assign-active-organization.hook').default;

    mocks.createDrizzleConnection.mockReturnValue(db);
    mocks.adminPlugin.mockReturnValue(adminPluginInstance);
    mocks.organizationPlugin.mockReturnValue(organizationPluginInstance);
    mocks.assignActiveOrganizationHook.mockReturnValue(sessionCreateHook);
    mocks.drizzleAdapter.mockReturnValue(adapter);
    mocks.betterAuth.mockReturnValue(authInstance);
    setup?.(mocks);

    try {
      auth = jest.requireActual<{ default: unknown }>(
        '@common/config/auth.config',
      ).default;
    } catch (caught) {
      error = caught;
    }
  });

  return { auth, error, ...mocks };
};

describe('auth.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...validEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('exports the better-auth instance', () => {
    const { auth, error } = loadAuthConfig();

    expect(error).toBeUndefined();
    expect(auth).toBe(authInstance);
  });

  it('loads the .env file before reading the environment', () => {
    const { dotenvConfig, betterAuth } = loadAuthConfig(({ dotenvConfig }) => {
      dotenvConfig.mockImplementation(() => {
        process.env.BETTER_AUTH_SECRET = 'b'.repeat(32);
        return { parsed: {} };
      });
    });

    expect(dotenvConfig).toHaveBeenCalledTimes(1);
    expect(betterAuth).toHaveBeenCalledWith(
      expect.objectContaining({ secret: 'b'.repeat(32) }),
    );
  });

  it('creates the drizzle connection from the parsed environment', () => {
    const { createDrizzleConnection } = loadAuthConfig();

    expect(createDrizzleConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USERNAME: 'user',
        DB_PASSWORD: 'password',
        DB_NAME: 'eruditia',
        DB_LOGGING: false,
      }),
    );
  });

  it('builds the drizzle adapter for postgres with the better-auth tables', () => {
    const { drizzleAdapter } = loadAuthConfig();

    expect(drizzleAdapter).toHaveBeenCalledWith(db, {
      provider: 'pg',
      schema: expect.objectContaining({
        user: expect.anything(),
        session: expect.anything(),
        account: expect.anything(),
        verification: expect.anything(),
      }),
    });
    expect(Object.keys(drizzleAdapter.mock.calls[0][1].schema).sort()).toEqual(
      Object.keys(schema).sort(),
    );
  });

  it('configures better-auth from the environment', () => {
    const { betterAuth } = loadAuthConfig();

    expect(betterAuth).toHaveBeenCalledWith({
      database: adapter,
      secret: 'a'.repeat(32),
      baseURL: 'http://localhost:3000',
      trustedOrigins: ['http://localhost:4200', 'http://localhost:5173'],
      emailAndPassword: { enabled: true, disableSignUp: true },
      databaseHooks: {
        session: { create: { before: sessionCreateHook } },
      },
      plugins: [adminPluginInstance, organizationPluginInstance],
    });
  });

  it('builds the plugins and the session hook on the same connection', () => {
    const { adminPlugin, organizationPlugin, assignActiveOrganizationHook } =
      loadAuthConfig();

    expect(adminPlugin).toHaveBeenCalledWith();
    expect(organizationPlugin).toHaveBeenCalledWith(db);
    expect(assignActiveOrganizationHook).toHaveBeenCalledWith(db);
  });

  it('uses no trusted origins when TRUSTED_ORIGINS is not set', () => {
    delete process.env.TRUSTED_ORIGINS;

    const { betterAuth } = loadAuthConfig();

    expect(betterAuth).toHaveBeenCalledWith(
      expect.objectContaining({ trustedOrigins: [] }),
    );
  });

  it('throws and does not connect when the environment is invalid', () => {
    process.env.BETTER_AUTH_SECRET = 'too-short';

    const { error, createDrizzleConnection, betterAuth } = loadAuthConfig();

    expect(error).toBeDefined();
    expect(createDrizzleConnection).not.toHaveBeenCalled();
    expect(betterAuth).not.toHaveBeenCalled();
  });
});
