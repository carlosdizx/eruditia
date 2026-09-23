import 'reflect-metadata';
import databaseOptionsUtil from '@database/util/database-options.util';
import DatabaseEnvInterface from '@database/interfaces/database-env.interface';

const env: DatabaseEnvInterface = {
  DB_HOST: 'localhost',
  DB_PORT: 5433,
  DB_USERNAME: 'user',
  DB_PASSWORD: 'password',
  DB_NAME: 'eruditia',
  DB_LOGGING: false,
};

describe('databaseOptionsUtil', () => {
  it('maps the environment variables to the pg pool config', () => {
    expect(databaseOptionsUtil(env)).toEqual({
      host: 'localhost',
      port: 5433,
      user: 'user',
      password: 'password',
      database: 'eruditia',
    });
  });
});
