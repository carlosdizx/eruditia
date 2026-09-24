import { generateId } from 'better-auth';
import { hashPassword } from 'better-auth/crypto';
import { MigrationParams } from 'umzug';
import { account, user } from '@database/schema';
import { DrizzleDb } from '@database/types/drizzle.types';
import { down, up } from '@database/seeders/20260923180649-create_super_admin';

jest.mock('better-auth', () => ({ generateId: jest.fn() }));
jest.mock('better-auth/crypto', () => ({ hashPassword: jest.fn() }));

const createDb = () => {
  const values = jest.fn();
  const where = jest.fn();
  const tx = {
    insert: jest.fn().mockReturnValue({ values }),
    delete: jest.fn().mockReturnValue({ where }),
  };
  const db = {
    transaction: jest.fn((run: (t: typeof tx) => Promise<void>) => run(tx)),
  };

  return { db, tx, values, where };
};

const paramsFor = (db: object) =>
  ({
    context: db as DrizzleDb,
    name: 'seed',
    path: '',
  }) as MigrationParams<DrizzleDb>;

describe('create_super_admin seed', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      SUPER_ADMIN_NAME: 'Root',
      SUPER_ADMIN_EMAIL: 'Root@Example.com',
      SUPER_ADMIN_PASSWORD: 'secret123',
    };
    jest
      .mocked(generateId)
      .mockReturnValueOnce('user-id')
      .mockReturnValueOnce('account-id');
    jest.mocked(hashPassword).mockResolvedValue('hashed-password');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('up', () => {
    it('inserts the super admin user', async () => {
      const { db, tx, values } = createDb();

      await up(paramsFor(db));

      expect(tx.insert).toHaveBeenNthCalledWith(1, user);
      expect(values).toHaveBeenNthCalledWith(1, {
        id: 'user-id',
        name: 'Root',
        email: 'root@example.com',
        emailVerified: true,
        role: 'superadmin',
      });
    });

    it('inserts a credential account with the hashed password', async () => {
      const { db, tx, values } = createDb();

      await up(paramsFor(db));

      expect(hashPassword).toHaveBeenCalledWith('secret123');
      expect(tx.insert).toHaveBeenNthCalledWith(2, account);
      expect(values).toHaveBeenNthCalledWith(2, {
        id: 'account-id',
        accountId: 'user-id',
        providerId: 'credential',
        userId: 'user-id',
        password: 'hashed-password',
      });
    });

    it('fails before touching the database without the env variables', async () => {
      process.env = {};
      const { db } = createDb();

      await expect(up(paramsFor(db))).rejects.toThrow();
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe('down', () => {
    it('deletes the super admin by email', async () => {
      const { db, tx, where } = createDb();

      await down(paramsFor(db));

      expect(tx.delete).toHaveBeenCalledWith(user);
      expect(where).toHaveBeenCalledTimes(1);
    });
  });
});
