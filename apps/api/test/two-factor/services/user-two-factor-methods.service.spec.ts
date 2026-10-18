import 'reflect-metadata';
import { Transaction } from 'sequelize';
import TwoFactorMethodEnum from '@common/enums/two-factor-method.enum';
import UserTwoFactorMethodsService from '../../../src/two-factor/services/user-two-factor-methods.service';
import UserTwoFactorMethodRepository from '../../../src/two-factor/repositories/user-two-factor-method.repository';

describe('UserTwoFactorMethodsService', () => {
  let repository: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    updateByPk: jest.Mock;
    clearDefaultExcept: jest.Mock;
    touchLastUsed: jest.Mock;
  };
  let service: UserTwoFactorMethodsService;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const now = new Date('2026-10-04T12:00:00Z');

  beforeEach(() => {
    repository = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'method-id' }),
      updateByPk: jest.fn().mockResolvedValue({ id: 'method-id' }),
      clearDefaultExcept: jest.fn().mockResolvedValue(undefined),
      touchLastUsed: jest.fn().mockResolvedValue(undefined),
    };
    service = new UserTwoFactorMethodsService(
      repository as unknown as UserTwoFactorMethodRepository,
    );
  });

  it('findEnabledByUser lists only enabled methods', async () => {
    await service.findEnabledByUser('user-id');

    expect(repository.findAll).toHaveBeenCalledWith(
      { userId: 'user-id', isEnabled: true },
      undefined,
    );
  });

  it('findEnabledByType looks up an enabled method of that type', async () => {
    repository.findOne.mockResolvedValue({ id: 'method-id' });

    await expect(
      service.findEnabledByType('user-id', TwoFactorMethodEnum.EMAIL),
    ).resolves.toEqual({ id: 'method-id' });
    expect(repository.findOne).toHaveBeenCalledWith(
      { userId: 'user-id', type: TwoFactorMethodEnum.EMAIL, isEnabled: true },
      false,
      { attributes: ['id', 'type'] },
    );
  });

  describe('enableEmail', () => {
    it('creates the email method enabled, default and verified', async () => {
      await expect(
        service.enableEmail('user-id', now, transaction),
      ).resolves.toEqual({ id: 'method-id' });

      expect(repository.create).toHaveBeenCalledWith(
        {
          userId: 'user-id',
          type: TwoFactorMethodEnum.EMAIL,
          isEnabled: true,
          isDefault: true,
          verifiedAt: now,
        },
        { transaction },
      );
      expect(repository.updateByPk).not.toHaveBeenCalled();
    });

    it('first removes the default flag from any other method', async () => {
      await service.enableEmail('user-id', now, transaction);

      expect(repository.clearDefaultExcept).toHaveBeenCalledWith(
        'user-id',
        TwoFactorMethodEnum.EMAIL,
        transaction,
      );
      expect(
        repository.clearDefaultExcept.mock.invocationCallOrder[0],
      ).toBeLessThan(repository.create.mock.invocationCallOrder[0]);
    });

    it('looks for an existing email method within the transaction', async () => {
      await service.enableEmail('user-id', now, transaction);

      expect(repository.findOne).toHaveBeenCalledWith(
        { userId: 'user-id', type: TwoFactorMethodEnum.EMAIL },
        false,
        { attributes: ['id', 'verifiedAt'], transaction },
      );
    });

    it('re-enables an existing email method instead of duplicating it', async () => {
      repository.findOne.mockResolvedValue({ id: 'old-id', verifiedAt: null });

      await service.enableEmail('user-id', now, transaction);

      expect(repository.updateByPk).toHaveBeenCalledWith(
        'old-id',
        { isEnabled: true, isDefault: true, verifiedAt: now },
        { transaction },
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('keeps the original verification date of an existing method', async () => {
      const verifiedAt = new Date('2026-01-01T00:00:00Z');
      repository.findOne.mockResolvedValue({ id: 'old-id', verifiedAt });

      await service.enableEmail('user-id', now, transaction);

      expect(repository.updateByPk).toHaveBeenCalledWith(
        'old-id',
        expect.objectContaining({ verifiedAt }),
        { transaction },
      );
    });
  });

  it('touchLastUsed delegates to the repository', async () => {
    await service.touchLastUsed(
      'user-id',
      TwoFactorMethodEnum.EMAIL,
      now,
      transaction,
    );

    expect(repository.touchLastUsed).toHaveBeenCalledWith(
      'user-id',
      TwoFactorMethodEnum.EMAIL,
      now,
      transaction,
    );
  });
});
