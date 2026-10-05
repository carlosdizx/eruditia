import 'reflect-metadata';
import { ConflictException, Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import UserModel from '@database/models/user.model';
import UserStatusEnum from '@common/enums/user-status.enum';
import UserRepository from '../../src/users/user.repository';

type RepositoryInternals = {
  model: unknown;
  logger: Logger;
  findByPkNotFoundMessage: string;
  findOneNotFoundMessage: string;
};

describe('UserRepository', () => {
  let repository: UserRepository;
  let internals: RepositoryInternals;

  beforeEach(() => {
    repository = new UserRepository();
    internals = repository as unknown as RepositoryInternals;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extends AbstractRepository', () => {
    expect(repository).toBeInstanceOf(AbstractRepository);
  });

  it('works over UserModel', () => {
    expect(internals.model).toBe(UserModel);
  });

  it('uses a logger named after the repository', () => {
    expect(internals.logger).toBeInstanceOf(Logger);
    expect((internals.logger as unknown as { context: string }).context).toBe(
      UserRepository.name,
    );
  });

  it('uses user-specific not found messages', () => {
    expect(internals.findByPkNotFoundMessage).toBe('Usuario no encontrado');
    expect(internals.findOneNotFoundMessage).toBe('Usuario no encontrado');
  });

  describe('markAsVerified', () => {
    const transaction = { id: 'tx' } as unknown as Transaction;
    const now = new Date();
    let update: jest.SpyInstance;

    beforeEach(() => {
      repository.unassignLoggerError();
      update = jest.spyOn(UserModel, 'update').mockResolvedValue([1]);
    });

    it('activates, verifies and enables 2FA only if the user was not verified', async () => {
      await expect(
        repository.markAsVerified('user-id', now, transaction),
      ).resolves.toBe(true);

      expect(update).toHaveBeenCalledWith(
        {
          status: UserStatusEnum.ACTIVE,
          isVerified: true,
          verifiedAt: now,
          twoFactorEnabled: true,
        },
        { where: { id: 'user-id', isVerified: false }, transaction },
      );
    });

    it('returns false when another request already verified the user', async () => {
      update.mockResolvedValue([0]);

      await expect(repository.markAsVerified('user-id', now)).resolves.toBe(
        false,
      );
    });

    it('wraps database errors in a ConflictException', async () => {
      update.mockRejectedValue(new Error('db down'));

      await expect(
        repository.markAsVerified('user-id', now),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
