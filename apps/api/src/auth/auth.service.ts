import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import { verifyPassword } from '@common/utils/password.util';
import PermissionEnum from '@common/enums/permission.enum';
import TwoFactorMethodEnum from '@common/enums/two-factor-method.enum';
import OrganizationModel from '@database/models/organization.model';
import RoleModel from '@database/models/role.model';
import UserModel from '@database/models/user.model';
import UsersService from '../users/users.service';
import PermissionsService from '../permissions/services/permissions.service';
import UserTwoFactorMethodsService from '../two-factor/services/user-two-factor-methods.service';
import UserTwoFactorCodesService from '../two-factor/services/user-two-factor-codes.service';
import SessionsService from './sessions/sessions.service';
import LoginDto from './dto/login.dto';
import VerifyTwoFactorDto from './dto/verify-two-factor.dto';
import canAuthenticate from './utils/can-authenticate.util';
import isCoreRole from './utils/is-core-role.util';
import AuthContextInterface from './interfaces/auth-context.interface';
import RequestMetadataInterface from './interfaces/request-metadata.interface';
import {
  ACCOUNT_DISABLED_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  TWO_FACTOR_UNAVAILABLE_MESSAGE,
} from './constants/auth-messages.constant';

// Si el email no existe se verifica contra este hash igualmente, para que el
// tiempo de respuesta no revele qué correos están registrados.
export const DUMMY_PASSWORD_HASH =
  'scrypt$16384$8$1$MASHlyh9xC/3Qry3MLLFEw==$I6s+fG2tya0reQQ9144GNpfGp7Lc+bpFpKg48vp5j+CEJzEnwNNV7YC+DFjcOgZOTV/MgbuuKTu00gAowZBOWQ==';

type SessionUser = Pick<UserModel, 'id' | 'organizationId'>;

@Injectable()
export default class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly permissionsService: PermissionsService,
    private readonly userTwoFactorMethodsService: UserTwoFactorMethodsService,
    private readonly userTwoFactorCodesService: UserTwoFactorCodesService,
  ) {}

  private openSession = async (
    user: SessionUser,
    metadata: RequestMetadataInterface,
    transaction?: Transaction,
  ) => {
    const { token, session } = await this.sessionsService.createSession(
      user,
      metadata,
      transaction,
    );

    await this.usersService.updateByPk(
      user.id,
      { lastLoginAt: session.lastActivityAt },
      { transaction },
    );

    return {
      twoFactorRequired: false as const,
      accessToken: token,
      tokenType: 'Bearer',
      expiresAt: session.expiresAt,
    };
  };

  // La contraseña temporal solo llegó al correo: entrar con ella demuestra que
  // el usuario controla ese correo, así que se activa, se verifica y el correo
  // queda como su 2FA por defecto.
  private completeFirstLogin = async (
    user: SessionUser,
    metadata: RequestMetadataInterface,
  ) => {
    return await this.usersService.transaction(async (transaction) => {
      const now = new Date();

      if (await this.usersService.markAsVerified(user.id, now, transaction))
        await this.userTwoFactorMethodsService.enableEmail(
          user.id,
          now,
          transaction,
        );

      return await this.openSession(user, metadata, transaction);
    });
  };

  private startTwoFactorChallenge = async (
    user: Pick<UserModel, 'id' | 'email' | 'firstName'>,
  ) => {
    const method = await this.userTwoFactorMethodsService.findEnabledByType(
      user.id,
      TwoFactorMethodEnum.EMAIL,
    );

    if (!method) throw new ForbiddenException(TWO_FACTOR_UNAVAILABLE_MESSAGE);

    const { challengeId, expiresAt } =
      await this.userTwoFactorCodesService.issueEmailCode(user);

    return {
      twoFactorRequired: true as const,
      method: TwoFactorMethodEnum.EMAIL,
      challengeId,
      expiresAt,
    };
  };

  public login = async (dto: LoginDto, metadata: RequestMetadataInterface) => {
    const user = await this.usersService.findOne({ email: dto.email }, false, {
      attributes: [
        'id',
        'organizationId',
        'firstName',
        'email',
        'password',
        'status',
        'isActive',
        'isVerified',
        'twoFactorEnabled',
      ],
      include: [{ model: OrganizationModel, attributes: ['id', 'isActive'] }],
    });

    const passwordMatches = await verifyPassword(
      dto.password,
      user?.password ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches)
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);

    if (!canAuthenticate(user))
      throw new ForbiddenException(ACCOUNT_DISABLED_MESSAGE);

    if (!user.isVerified) return await this.completeFirstLogin(user, metadata);

    if (user.twoFactorEnabled) return await this.startTwoFactorChallenge(user);

    return await this.openSession(user, metadata);
  };

  public verifyTwoFactor = async (
    dto: VerifyTwoFactorDto,
    metadata: RequestMetadataInterface,
  ) => {
    const userId = await this.userTwoFactorCodesService.verifyCode(
      dto.challengeId,
      dto.code,
    );

    const user = await this.usersService.findByPk(userId, false, {
      attributes: ['id', 'organizationId', 'status', 'isActive'],
      include: [{ model: OrganizationModel, attributes: ['id', 'isActive'] }],
    });

    // El estado puede cambiar entre el login y la verificación del código.
    if (!user || !canAuthenticate(user))
      throw new ForbiddenException(ACCOUNT_DISABLED_MESSAGE);

    return await this.usersService.transaction(async (transaction) => {
      await this.userTwoFactorMethodsService.touchLastUsed(
        user.id,
        TwoFactorMethodEnum.EMAIL,
        new Date(),
        transaction,
      );

      return await this.openSession(user, metadata, transaction);
    });
  };

  public logout = async (auth: AuthContextInterface) => {
    await this.sessionsService.revokeSession(auth.sessionId, auth.userId);
  };

  public me = async (auth: AuthContextInterface) => {
    const [user, permissions] = await Promise.all([
      this.usersService.findByPk(auth.userId, true, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: RoleModel,
            attributes: ['id', 'name', 'label', 'labelEs', 'category'],
          },
          { model: OrganizationModel, attributes: ['id', 'name', 'slug'] },
        ],
      }),
      isCoreRole(auth)
        ? Object.values(PermissionEnum)
        : this.permissionsService.getEffectivePermissions(
            auth.roleId,
            auth.organizationId,
          ),
    ]);

    return { ...user, permissions };
  };
}
