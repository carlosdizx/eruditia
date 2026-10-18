import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import UserTwoFactorMethodModel from '@database/models/user-two-factor-method.model';
import TwoFactorMethodEnum from '@common/enums/two-factor-method.enum';

@Injectable()
export default class UserTwoFactorMethodRepository extends AbstractRepository<UserTwoFactorMethodModel> {
  constructor() {
    super(UserTwoFactorMethodModel, {
      logger: new Logger(UserTwoFactorMethodRepository.name),
      findByPkNotFoundMessage: 'Método 2FA no encontrado',
      findOneNotFoundMessage: 'Método 2FA no encontrado',
    });
  }

  public async clearDefaultExcept(
    userId: string,
    type: TwoFactorMethodEnum,
    transaction?: Transaction,
  ): Promise<void> {
    try {
      await this.model.update(
        { isDefault: false },
        {
          where: { userId, isDefault: true, type: { [Op.ne]: type } },
          transaction,
        },
      );
    } catch (error) {
      this.logger.error('Error clearing default method');
      this.logger.error(error);
      throw new ConflictException('No se pudo actualizar el método 2FA');
    }
  }

  public async touchLastUsed(
    userId: string,
    type: TwoFactorMethodEnum,
    lastUsedAt: Date,
    transaction?: Transaction,
  ): Promise<void> {
    try {
      await this.model.update(
        { lastUsedAt },
        { where: { userId, type }, transaction },
      );
    } catch (error) {
      this.logger.error('Error touching method');
      this.logger.error(error);
      throw new ConflictException('No se pudo actualizar el método 2FA');
    }
  }
}
