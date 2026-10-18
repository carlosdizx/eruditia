import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import UserTwoFactorCodeModel from '@database/models/user-two-factor-code.model';
import UserTwoFactorCodeRepository from '../../../src/two-factor/repositories/user-two-factor-code.repository';
import { TWO_FACTOR_CODE_MAX_ATTEMPTS } from '../../../src/two-factor/constants/two-factor.constant';

describe('UserTwoFactorCodeRepository', () => {
  let repository: UserTwoFactorCodeRepository;
  let update: jest.SpyInstance;
  let increment: jest.SpyInstance;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const now = new Date('2026-10-04T12:00:00Z');

  beforeEach(() => {
    repository = new UserTwoFactorCodeRepository();
    repository.unassignLoggerError();
    update = jest
      .spyOn(UserTwoFactorCodeModel, 'update')
      .mockResolvedValue([1]);
    increment = jest
      .spyOn(UserTwoFactorCodeModel, 'increment')
      .mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extends AbstractRepository over UserTwoFactorCodeModel', () => {
    expect(repository).toBeInstanceOf(AbstractRepository);
    expect((repository as unknown as { model: unknown }).model).toBe(
      UserTwoFactorCodeModel,
    );
  });

  describe('invalidatePending', () => {
    it('consumes every pending code of the user', async () => {
      update.mockResolvedValue([2]);

      await expect(
        repository.invalidatePending('user-id', now, transaction),
      ).resolves.toBe(2);
      expect(update).toHaveBeenCalledWith(
        { consumedAt: now },
        { where: { userId: 'user-id', consumedAt: null }, transaction },
      );
    });

    it('wraps database errors in a ConflictException', async () => {
      update.mockRejectedValue(new Error('db down'));

      await expect(
        repository.invalidatePending('user-id', now),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('incrementAttempts', () => {
    it('increments atomically in the database', async () => {
      await repository.incrementAttempts('code-id');

      expect(increment).toHaveBeenCalledWith('attempts', {
        where: { id: 'code-id' },
      });
    });

    it('wraps database errors in a ConflictException', async () => {
      increment.mockRejectedValue(new Error('db down'));

      await expect(
        repository.incrementAttempts('code-id'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('consume', () => {
    it('only consumes a code that is still pending, alive and with attempts left', async () => {
      await expect(repository.consume('code-id', now)).resolves.toBe(true);

      expect(update).toHaveBeenCalledWith(
        { consumedAt: now },
        {
          where: {
            id: 'code-id',
            consumedAt: null,
            expiresAt: { [Op.gt]: now },
            attempts: { [Op.lt]: TWO_FACTOR_CODE_MAX_ATTEMPTS },
          },
        },
      );
    });

    it('returns false when a concurrent request already consumed it', async () => {
      update.mockResolvedValue([0]);

      await expect(repository.consume('code-id', now)).resolves.toBe(false);
    });

    it('wraps database errors in a ConflictException', async () => {
      update.mockRejectedValue(new Error('db down'));

      await expect(repository.consume('code-id', now)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
