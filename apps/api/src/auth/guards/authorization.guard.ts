import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import PermissionsService from '../../permissions/services/permissions.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '../decorators/auth-with-permissions.decorator';
import isCoreRole from '../utils/is-core-role.util';
import AuthContextInterface from '../interfaces/auth-context.interface';
import AuthenticatedRequestInterface from '../interfaces/authenticated-request.interface';
import AuthWithPermissionsOptionsInterface from '../interfaces/auth-with-permissions-options.interface';
import {
  MISSING_PERMISSION_MESSAGE,
  MISSING_ROLE_MESSAGE,
} from '../constants/auth-messages.constant';

type Requirement = Required<AuthWithPermissionsOptionsInterface>;

const hasRole = ({ roles }: Requirement, auth: AuthContextInterface) =>
  !roles.length || roles.some((role) => role === auth.roleName);

const hasPermissions = (
  { permissions, mode }: Requirement,
  granted: Set<string>,
) =>
  mode === 'all'
    ? permissions.every((permission) => granted.has(permission))
    : permissions.some((permission) => granted.has(permission));

// Corre después del AuthGuard. Sin @AuthWithPermissions basta con estar
// autenticado.
@Injectable()
export default class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets))
      return true;

    // Método y controlador se suman: hay que cumplir ambos.
    const requirements = this.reflector
      .getAll<(Requirement | undefined)[]>(AUTH_WITH_PERMISSIONS_KEY, targets)
      .filter((requirement) => requirement !== undefined);

    if (!requirements.length) return true;

    const { auth } = context
      .switchToHttp()
      .getRequest<AuthenticatedRequestInterface>();
    if (!auth) throw new UnauthorizedException();

    if (!requirements.every((requirement) => hasRole(requirement, auth)))
      throw new ForbiddenException(MISSING_ROLE_MESSAGE);

    const needsPermissions = requirements.some(
      ({ permissions }) => permissions.length,
    );
    if (!needsPermissions || isCoreRole(auth)) return true;

    const granted = new Set(
      await this.permissionsService.getEffectivePermissions(
        auth.roleId,
        auth.organizationId,
      ),
    );

    if (
      !requirements.every((requirement) => hasPermissions(requirement, granted))
    )
      throw new ForbiddenException(MISSING_PERMISSION_MESSAGE);

    return true;
  }
}
