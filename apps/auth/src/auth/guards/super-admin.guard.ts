import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import SystemRole from '@auth/enums/system-role.enum';
import getRequestSession from '@auth/utils/get-request-session.util';
import hasRole from '@auth/utils/has-role.util';

@Injectable()
export default class SuperAdminGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const { user } = getRequestSession(context);

    if (!hasRole(user.role, [SystemRole.SUPER_ADMIN])) {
      throw new ForbiddenException(
        'Only the system super admin can perform this action',
      );
    }

    return true;
  }
}
