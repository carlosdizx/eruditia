import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import UserTwoFactorMethodModel from '@database/models/user-two-factor-method.model';
import CrudService from '@database/services/crud.service';
import TwoFactorMethodEnum from '@common/enums/two-factor-method.enum';
import UserTwoFactorMethodRepository from '../repositories/user-two-factor-method.repository';

@Injectable()
export default class UserTwoFactorMethodsService extends CrudService<
  UserTwoFactorMethodModel,
  UserTwoFactorMethodRepository
> {
  constructor(repository: UserTwoFactorMethodRepository) {
    super(repository);
  }

  public findEnabledByUser = async (userId: string) => {
    return await this.findAll({ userId, isEnabled: true });
  };

  public findEnabledByType = async (
    userId: string,
    type: TwoFactorMethodEnum,
  ) => {
    return await this.findOne({ userId, type, isEnabled: true }, false, {
      attributes: ['id', 'type'],
    });
  };

  // El correo queda como método por defecto: ya está verificado porque la
  // contraseña temporal solo llegó ahí.
  public enableEmail = async (
    userId: string,
    verifiedAt: Date,
    transaction?: Transaction,
  ) => {
    const type = TwoFactorMethodEnum.EMAIL;

    await this.repository.clearDefaultExcept(userId, type, transaction);

    const existing = await this.findOne({ userId, type }, false, {
      attributes: ['id', 'verifiedAt'],
      transaction,
    });

    if (existing)
      return await this.updateByPk(
        existing.id,
        {
          isEnabled: true,
          isDefault: true,
          verifiedAt: existing.verifiedAt ?? verifiedAt,
        },
        { transaction },
      );

    return await this.create(
      { userId, type, isEnabled: true, isDefault: true, verifiedAt },
      { transaction },
    );
  };

  public touchLastUsed = async (
    userId: string,
    type: TwoFactorMethodEnum,
    lastUsedAt: Date,
    transaction?: Transaction,
  ) => {
    await this.repository.touchLastUsed(userId, type, lastUsedAt, transaction);
  };
}
