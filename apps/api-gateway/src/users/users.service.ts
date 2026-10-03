import { Injectable } from '@nestjs/common';
import { UserModel } from '@database/models/user.model';
import CrudService from '@database/services/crud.service';
import UserRepository from './user.repository';

@Injectable()
export default class UsersService extends CrudService<
  UserModel,
  UserRepository
> {
  constructor(repository: UserRepository) {
    super(repository);
  }

  private toSafeUser = (user: UserModel) => {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  };
}
