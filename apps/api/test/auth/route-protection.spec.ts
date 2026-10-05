import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import UsersController from '../../src/users/users.controller';
import OrganizationsController from '../../src/organizations/organizations.controller';
import RolesController from '../../src/roles/roles.controller';

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
  it('POST /users/super-admin is public to bootstrap the system', () => {
    expect(metadataOf(UsersController, 'createSuperAdmin', IS_PUBLIC_KEY)).toBe(
      true,
    );
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

  it('GET /roles requires role:list', () => {
    expect(
      metadataOf(RolesController, 'getRoles', AUTH_WITH_PERMISSIONS_KEY),
    ).toEqual({
      roles: [],
      permissions: [PermissionEnum.ROLE_LIST],
      mode: 'all',
    });
  });
});
