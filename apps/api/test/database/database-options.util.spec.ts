import 'reflect-metadata';
import databaseOptionsUtil from '@database/util/database-options.util';
import DatabaseEnvInterface from '@database/interfaces/database-env.interface';
import models from '@database/models';

const env: DatabaseEnvInterface = {
  DB_HOST: 'localhost',
  DB_PORT: 5433,
  DB_USERNAME: 'user',
  DB_PASSWORD: 'password',
  DB_NAME: 'eruditia',
  DB_LOGGING: false,
};

describe('databaseOptionsUtil', () => {
  it('maps the environment variables to the sequelize options', () => {
    expect(databaseOptionsUtil(env)).toMatchObject({
      host: 'localhost',
      port: 5433,
      username: 'user',
      password: 'password',
      database: 'eruditia',
    });
  });

  it('uses postgres as the dialect', () => {
    expect(databaseOptionsUtil(env).dialect).toBe('postgres');
  });

  it('uses the registered models', () => {
    expect(databaseOptionsUtil(env).models).toBe(models);
  });

  describe('logging', () => {
    it('is console.log when DB_LOGGING is true', () => {
      const options = databaseOptionsUtil({ ...env, DB_LOGGING: true });

      expect(options.logging).toBe(console.log);
    });

    it('is disabled when DB_LOGGING is false', () => {
      const options = databaseOptionsUtil({ ...env, DB_LOGGING: false });

      expect(options.logging).toBe(false);
    });
  });
});
