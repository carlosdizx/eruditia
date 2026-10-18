import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import UserTwoFactorMethodModel from '@database/models/user-two-factor-method.model';
import TwoFactorMethodEnum from '@common/enums/two-factor-method.enum';
import UserTwoFactorMethodRepository from '../../../src/two-factor/repositories/user-two-factor-method.repository';

describe('UserTwoFactorMethodRepository', () => {
  let repository: UserTwoFactorMethodRepository;
  let update: jest.SpyInstance;

  const transaction = { id: 'tx' } as unknown as Transaction;

  beforeEach(() => {
    repository = new UserTwoFactorMethodRepository();
    repository.unassignLoggerError();
    update = jest
      .spyOn(UserTwoFactorMethodModel, 'update')
      .mockResolvedValue([1]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extends AbstractRepository over UserTwoFactorMethodModel', () => {
    expect(repository).toBeInstanceOf(AbstractRepository);
    expect((repository as unknown as { model: unknown }).model).toBe(
      UserTwoFactorMethodModel,
    );
  });

  describe('clearDefaultExcept', () => {
    it('unsets the default flag on every other method of the user', async () => {
      await repository.clearDefaultExcept(
        'user-id',
        TwoFactorMethodEnum.EMAIL,
        transaction,
      );

      expect(update).toHaveBeenCalledWith(
        { isDefault: false },
        {
          where: {
            userId: 'user-id',
            isDefault: true,
            type: { [Op.ne]: TwoFactorMethodEnum.EMAIL },
          },
          transaction,
        },
      );
    });

    it('wraps database errors in a ConflictException', async () => {
      update.mockRejectedValue(new Error('db down'));

      await expect(
        repository.clearDefaultExcept('user-id', TwoFactorMethodEnum.EMAIL),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('touchLastUsed', () => {
    it('updates lastUsedAt of the user method of that type', async () => {
      const now = new Date();

      await repository.touchLastUsed(
        'user-id',
        TwoFactorMethodEnum.EMAIL,
        now,
        transaction,
      );

      expect(update).toHaveBeenCalledWith(
        { lastUsedAt: now },
        {
          where: { userId: 'user-id', type: TwoFactorMethodEnum.EMAIL },
          transaction,
        },
      );
    });

    it('wraps database errors in a ConflictException', async () => {
      update.mockRejectedValue(new Error('db down'));

      await expect(
        repository.touchLastUsed(
          'user-id',
          TwoFactorMethodEnum.EMAIL,
          new Date(),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
