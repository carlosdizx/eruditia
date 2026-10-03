import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import { UserPasskeyModel } from '@database/models/user-passkey.model';

@Injectable()
export default class UserPasskeyRepository extends AbstractRepository<UserPasskeyModel> {
  constructor() {
    super(UserPasskeyModel, {
      logger: new Logger(UserPasskeyRepository.name),
      findByPkNotFoundMessage: 'Passkey no encontrada',
      findOneNotFoundMessage: 'Passkey no encontrada',
    });
  }
}
