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
import EmailService from '@email/email.service';
import temporaryPasswordTemplate, {
  TEMPORARY_PASSWORD_SUBJECT,
} from '@email/templates/temporary-password.template';

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
    private readonly emailService: EmailService,
  ) {
    super(repository);
  }

  private toSafeUser = (user: UserModel) => {
    const { password: _password, ...safeUser } = user;
    return safeUser as UserModel;
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

    // Dentro de la transacción: si el correo no sale, se revierte la creación
    // y no queda una cuenta cuya contraseña nadie conoce.
    await this.emailService.main({
      from: this.configService.get('SMTP_USER', { infer: true }),
      to: user.email,
      subject: TEMPORARY_PASSWORD_SUBJECT,
      html: temporaryPasswordTemplate({
        firstName: user.firstName,
        email: user.email,
        password: temporaryPassword,
      }),
    });

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

      await this.createUser(
        {
          firstName: 'Super',
          lastName: 'Admin',
          email,
          roleId: role.id,
          status: UserStatusEnum.ACTIVE,
        },
        transaction,
      );

      this.logger.verbose('Super admin created');
    });
  };
}
