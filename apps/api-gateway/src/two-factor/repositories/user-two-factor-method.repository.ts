import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import { UserTwoFactorMethodModel } from '@database/models/user-two-factor-method.model';

@Injectable()
export default class UserTwoFactorMethodRepository extends AbstractRepository<UserTwoFactorMethodModel> {
  constructor() {
    super(UserTwoFactorMethodModel, {
      logger: new Logger(UserTwoFactorMethodRepository.name),
      findByPkNotFoundMessage: 'Método 2FA no encontrado',
      findOneNotFoundMessage: 'Método 2FA no encontrado',
    });
  }
}
