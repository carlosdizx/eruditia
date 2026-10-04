import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyPassword } from '@common/utils/password.util';
import PermissionEnum from '@common/enums/permission.enum';
import OrganizationModel from '@database/models/organization.model';
import RoleModel from '@database/models/role.model';
import UsersService from '../users/users.service';
import PermissionsService from '../permissions/services/permissions.service';
import SessionsService from './sessions/sessions.service';
import LoginDto from './dto/login.dto';
import canAuthenticate from './utils/can-authenticate.util';
import isCoreRole from './utils/is-core-role.util';
import AuthContextInterface from './interfaces/auth-context.interface';
import RequestMetadataInterface from './interfaces/request-metadata.interface';
import {
  ACCOUNT_DISABLED_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
} from './constants/auth-messages.constant';

// Si el email no existe se verifica contra este hash igualmente, para que el
// tiempo de respuesta no revele qué correos están registrados.
export const DUMMY_PASSWORD_HASH =
  'scrypt$16384$8$1$MASHlyh9xC/3Qry3MLLFEw==$I6s+fG2tya0reQQ9144GNpfGp7Lc+bpFpKg48vp5j+CEJzEnwNNV7YC+DFjcOgZOTV/MgbuuKTu00gAowZBOWQ==';

@Injectable()
export default class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  public login = async (dto: LoginDto, metadata: RequestMetadataInterface) => {
    const user = await this.usersService.findOne({ email: dto.email }, false, {
      attributes: ['id', 'organizationId', 'password', 'status', 'isActive'],
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

    const { token, session } = await this.sessionsService.createSession(
      user,
      metadata,
    );

    await this.usersService.updateByPk(user.id, {
      lastLoginAt: session.lastActivityAt,
    });

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresAt: session.expiresAt,
    };
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
