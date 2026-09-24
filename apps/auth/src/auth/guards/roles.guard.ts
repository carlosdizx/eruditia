import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import DRIZZLE from '@database/database.constants';
import type { DrizzleDb } from '@database/types/drizzle.types';
import findMemberRole from '@database/queries/find-member-role.query';
import OrganizationRole from '@auth/enums/organization-role.enum';
import { REQUIRED_ROLES_KEY } from '@auth/constants/auth-metadata.constants';
import getRequestSession from '@auth/utils/get-request-session.util';
import getActiveOrganizationId from '@auth/utils/get-active-organization-id.util';
import hasRole from '@auth/utils/has-role.util';

// Checks the role of the user inside their active organization. Read from
// the database on every request (not from the session) so a role change
// applies immediately.
@Injectable()
export default class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<
      OrganizationRole[] | undefined
    >(REQUIRED_ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles?.length) return true;

    const session = getRequestSession(context);
    const organizationId = getActiveOrganizationId(session);
    const role = await findMemberRole(this.db, session.user.id, organizationId);

    if (!hasRole(role, requiredRoles)) {
      throw new ForbiddenException(
        `This action requires one of these roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
