import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import UserModel from '@database/models/user.model';
import UserStatusEnum from '@common/enums/user-status.enum';

@Injectable()
export default class UserRepository extends AbstractRepository<UserModel> {
  constructor() {
    super(UserModel, {
      logger: new Logger(UserRepository.name),
      findByPkNotFoundMessage: 'Usuario no encontrado',
      findOneNotFoundMessage: 'Usuario no encontrado',
    });
  }

  // Condicional sobre isVerified: si dos primeros logins llegan a la vez, solo
  // uno lo marca y crea el método 2FA.
  public async markAsVerified(
    id: string,
    verifiedAt: Date,
    transaction?: Transaction,
  ): Promise<boolean> {
    try {
      const [affected] = await this.model.update(
        {
          status: UserStatusEnum.ACTIVE,
          isVerified: true,
          verifiedAt,
          twoFactorEnabled: true,
        },
        { where: { id, isVerified: false }, transaction },
      );
      return affected === 1;
    } catch (error) {
      this.logger.error('Error marking user as verified');
      this.logger.error(error);
      throw new ConflictException('No se pudo verificar el usuario');
    }
  }
}
