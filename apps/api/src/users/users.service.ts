import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import UserModel from '@database/models/user.model';
import OrganizationModel from '@database/models/organization.model';
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
import RoleCategoryEnum from '@common/enums/role-category.enum';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import RolesService from '../roles/roles.service';
import EmailService from '@email/email.service';
import temporaryPasswordTemplate, {
  TEMPORARY_PASSWORD_SUBJECT,
} from '@email/templates/temporary-password.template';
import CreateOrganizationUserDto from './dto/create-organization-user.dto';
import UpdateOrganizationUserDto from './dto/update-organization-user.dto';
import {
  EMAIL_IN_USE_MESSAGE,
  INVALID_ROLE_MESSAGE,
  NO_ORGANIZATION_MESSAGE,
  PROTECTED_USER_MESSAGE,
} from './constants/user-messages.constant';

type OrganizationActor = Pick<
  AuthContextInterface,
  'userId' | 'organizationId'
>;

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
    if (existing) throw new ConflictException(EMAIL_IN_USE_MESSAGE);

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

  public markAsVerified = async (
    userId: string,
    verifiedAt: Date,
    transaction?: Transaction,
  ) => {
    return await this.repository.markAsVerified(
      userId,
      verifiedAt,
      transaction,
    );
  };

  public registerUserToOrganization = async (
    organizationId: string,
    dto: CreateUserDto,
    transaction: Transaction,
  ) => {
    return await this.createUser({ ...dto, organizationId }, transaction);
  };

  private organizationOf = ({ organizationId }: OrganizationActor) => {
    if (!organizationId) throw new ForbiddenException(NO_ORGANIZATION_MESSAGE);
    return organizationId;
  };

  // Solo roles de organización: asignar uno de sistema (SUPER_ADMIN) sería
  // una escalada de privilegios.
  private assertAssignableRole = async (roleId: string) => {
    const role = await this.rolesService.findOne(
      { id: roleId, category: RoleCategoryEnum.CLIENT },
      false,
      { attributes: ['id'] },
    );
    if (!role) throw new BadRequestException(INVALID_ROLE_MESSAGE);
  };

  // Un usuario de otra organización responde 404, igual que uno inexistente.
  private findManageableUser = async (
    actor: OrganizationActor,
    userId: string,
  ) => {
    const user = (await this.findOne(
      { id: userId, organizationId: this.organizationOf(actor) },
      true,
      {
        attributes: ['id', 'roleId', 'isActive'],
        include: [{ model: OrganizationModel, attributes: ['id', 'ownerId'] }],
      },
    ))!;

    // Ni la propia cuenta ni la del dueño pueden perder el acceso por esta vía:
    // la organización podría quedarse sin nadie que la administre.
    const isProtected =
      user.id === actor.userId || user.organization?.ownerId === user.id;

    return { user, isProtected };
  };

  public createOrganizationUser = async (
    actor: OrganizationActor,
    dto: CreateOrganizationUserDto,
  ) => {
    const organizationId = this.organizationOf(actor);

    await this.assertAssignableRole(dto.roleId);

    return await this.transaction((transaction) =>
      this.createUser({ ...dto, organizationId }, transaction),
    );
  };

  public updateOrganizationUser = async (
    actor: OrganizationActor,
    userId: string,
    dto: UpdateOrganizationUserDto,
  ) => {
    const { user, isProtected } = await this.findManageableUser(actor, userId);

    const changesAccess =
      (dto.roleId !== undefined && dto.roleId !== user.roleId) ||
      dto.isActive === false;

    if (isProtected && changesAccess)
      throw new ForbiddenException(PROTECTED_USER_MESSAGE);

    if (dto.roleId) await this.assertAssignableRole(dto.roleId);

    return this.toSafeUser((await this.updateByPk(user.id, dto))!);
  };

  public deleteOrganizationUser = async (
    actor: OrganizationActor,
    userId: string,
  ) => {
    const { user, isProtected } = await this.findManageableUser(actor, userId);

    if (isProtected) throw new ForbiddenException(PROTECTED_USER_MESSAGE);

    await this.deleteByPk(user.id);
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
