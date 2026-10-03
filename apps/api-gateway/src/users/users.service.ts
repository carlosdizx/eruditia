import { ConflictException, Injectable } from '@nestjs/common';
import UserModel from '@database/models/user.model';
import CrudService from '@database/services/crud.service';
import UserRepository from './user.repository';
import CreateUserDto from './dto/create-user.dto';
import {
  generateFriendlyPassword,
  hashPassword,
} from '@common/utils/password.util';
import { Transaction } from 'sequelize';

@Injectable()
export default class UsersService extends CrudService<
  UserModel,
  UserRepository
> {
  constructor(protected readonly repository: UserRepository) {
    super(repository);
  }

  private toSafeUser = (user: UserModel) => {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  };

  public createUser = async (dto: CreateUserDto) => {
    const { email } = dto;

    const user = await this.findOne({ email }, false, {
      attributes: ['id'],
    });
    if (user) throw new ConflictException();

    const password = await hashPassword(generateFriendlyPassword());

    return this.create({ ...dto, password });
  };

  public registerUserToOrganization = async (
    organizationId: string,
    dto: CreateUserDto,
    transaction?: Transaction,
  ) => {};
}
