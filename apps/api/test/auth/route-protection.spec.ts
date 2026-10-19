import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import UsersController from '../../src/users/users.controller';
import OrganizationsController from '../../src/organizations/organizations.controller';
import RolesController from '../../src/roles/roles.controller';
import HealthController from '../../src/health/health.controller';

const metadataOf = (
  controller: { prototype: object },
  handler: string,
  key: string,
): unknown =>
  Reflect.getMetadata(
    key,
    Object.getOwnPropertyDescriptor(controller.prototype, handler)!
      .value as object,
  );

describe('route protection', () => {
  it('GET /health is public for the platform health check', () => {
    expect(metadataOf(HealthController, 'check', IS_PUBLIC_KEY)).toBe(true);
  });

  it('there is no public endpoint to create the super admin', () => {
    expect(
      Object.getOwnPropertyDescriptor(
        UsersController.prototype,
        'createSuperAdmin',
      ),
    ).toBeUndefined();
  });

  it('/organizations is restricted to the SUPER_ADMIN role', () => {
    expect(
      Reflect.getMetadata(AUTH_WITH_PERMISSIONS_KEY, OrganizationsController),
    ).toEqual({
      roles: [RoleNameEnum.SUPER_ADMIN],
      permissions: [],
      mode: 'all',
    });
  });

  it('GET /roles requires role:list or a permission to create/edit users', () => {
    expect(
      metadataOf(RolesController, 'getRoles', AUTH_WITH_PERMISSIONS_KEY),
    ).toEqual({
      roles: [],
      permissions: [
        PermissionEnum.ROLE_LIST,
        PermissionEnum.USER_CREATE,
        PermissionEnum.USER_UPDATE,
      ],
      mode: 'any',
    });
  });
});
