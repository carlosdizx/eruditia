import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import UserTwoFactorCodeModel from '@database/models/user-two-factor-code.model';

@Injectable()
export default class UserTwoFactorCodeRepository extends AbstractRepository<UserTwoFactorCodeModel> {
  constructor() {
    super(UserTwoFactorCodeModel, {
      logger: new Logger(UserTwoFactorCodeRepository.name),
      findByPkNotFoundMessage: 'Código no encontrado',
      findOneNotFoundMessage: 'Código no encontrado',
    });
  }
}
