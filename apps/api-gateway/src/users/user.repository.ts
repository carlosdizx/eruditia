import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import UserModel from '@database/models/user.model';

@Injectable()
export default class UserRepository extends AbstractRepository<UserModel> {
  constructor() {
    super(UserModel, {
      logger: new Logger(UserRepository.name),
      findByPkNotFoundMessage: 'Usuario no encontrado',
      findOneNotFoundMessage: 'Usuario no encontrado',
    });
  }
}
