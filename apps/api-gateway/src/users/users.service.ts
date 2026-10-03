import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import UserModel from '@database/models/user.model';
import CrudService from '@database/services/crud.service';
import UserRepository from './user.repository';
import CreateUserDto from './dto/create-user.dto';
import {
  generateFriendlyPassword,
  hashPassword,
} from '@common/utils/password.util';
import { Transaction } from 'sequelize';
import Env from '@common/schemas/env.schema';
import RoleNameEnum from '@common/enums/role-name.enum';
import UserStatusEnum from '@common/enums/user-status.enum';
import RolesService from '../roles/roles.service';

@Injectable()
export default class UsersService extends CrudService<
  UserModel,
  UserRepository
> {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    protected readonly repository: UserRepository,
    private readonly rolesService: RolesService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    super(repository);
  }

  private toSafeUser = (user: UserModel) => {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  };

  public createUser = async (
    dto: CreateUserDto & Partial<Pick<UserModel, 'organizationId' | 'status'>>,
    transaction?: Transaction,
  ) => {
    const { email } = dto;

    const existing = await this.findOne({ email }, false, {
      attributes: ['id'],
      transaction,
    });
    if (existing) throw new ConflictException();

    const temporaryPassword = generateFriendlyPassword();
    const password = await hashPassword(temporaryPassword);

    const user = await this.create({ ...dto, password }, { transaction });

    this.logger.verbose(`password created: ${temporaryPassword}`);

    return this.toSafeUser(user);
  };

  public registerUserToOrganization = async (
    organizationId: string,
    dto: CreateUserDto,
    transaction: Transaction,
  ) => {
    return await this.createUser({ ...dto, organizationId }, transaction);
  };

  public createSuperAdmin = async () => {
    const email = this.configService.get('SUPER_ADMIN_EMAIL', { infer: true });

    return await this.transaction(async (transaction) => {
      const role = (await this.rolesService.findOne(
        { name: RoleNameEnum.SUPER_ADMIN },
        true,
        { attributes: ['id'], transaction },
      ))!;

      return await this.createUser(
        {
          firstName: 'Super',
          lastName: 'Admin',
          email,
          roleId: role.id,
          status: UserStatusEnum.ACTIVE,
        },
        transaction,
      );
    });
  };
}
