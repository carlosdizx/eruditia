import { GUARDS_METADATA } from '@nestjs/common/constants';
import RequireRoles from '@auth/decorators/require-roles.decorator';
import OrganizationRole from '@auth/enums/organization-role.enum';
import RolesGuard from '@auth/guards/roles.guard';
import { REQUIRED_ROLES_KEY } from '@auth/constants/auth-metadata.constants';

describe('RequireRoles', () => {
  class Controller {
    @RequireRoles(OrganizationRole.ADMIN, OrganizationRole.SUPERVISOR)
    public handler() {
      return undefined;
    }
  }

  const handler = Object.getOwnPropertyDescriptor(
    Controller.prototype,
    'handler',
  )?.value as object;

  it('stores the required roles', () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, handler)).toEqual([
      'admin',
      'supervisor',
    ]);
  });

  it('applies RolesGuard, so the roles are always enforced', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([RolesGuard]);
  });
});
