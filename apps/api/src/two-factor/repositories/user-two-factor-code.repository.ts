import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import UserTwoFactorCodeModel from '@database/models/user-two-factor-code.model';
import { TWO_FACTOR_CODE_MAX_ATTEMPTS } from '../constants/two-factor.constant';

@Injectable()
export default class UserTwoFactorCodeRepository extends AbstractRepository<UserTwoFactorCodeModel> {
  constructor() {
    super(UserTwoFactorCodeModel, {
      logger: new Logger(UserTwoFactorCodeRepository.name),
      findByPkNotFoundMessage: 'Código no encontrado',
      findOneNotFoundMessage: 'Código no encontrado',
    });
  }

  public async invalidatePending(
    userId: string,
    now: Date,
    transaction?: Transaction,
  ): Promise<number> {
    try {
      const [affected] = await this.model.update(
        { consumedAt: now },
        { where: { userId, consumedAt: null }, transaction },
      );
      return affected;
    } catch (error) {
      this.logger.error('Error invalidating pending codes');
      this.logger.error(error);
      throw new ConflictException('No se pudieron invalidar los códigos');
    }
  }

  public async incrementAttempts(id: string): Promise<void> {
    try {
      await this.model.increment('attempts', { where: { id } });
    } catch (error) {
      this.logger.error('Error incrementing code attempts');
      this.logger.error(error);
      throw new ConflictException('No se pudo registrar el intento');
    }
  }

  // Condicional para que dos peticiones simultáneas no usen el mismo código.
  public async consume(id: string, now: Date): Promise<boolean> {
    try {
      const [affected] = await this.model.update(
        { consumedAt: now },
        {
          where: {
            id,
            consumedAt: null,
            expiresAt: { [Op.gt]: now },
            attempts: { [Op.lt]: TWO_FACTOR_CODE_MAX_ATTEMPTS },
          },
        },
      );
      return affected === 1;
    } catch (error) {
      this.logger.error('Error consuming code');
      this.logger.error(error);
      throw new ConflictException('No se pudo usar el código');
    }
  }
}
