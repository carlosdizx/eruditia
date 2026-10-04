import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import Public, { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import AuthWithPermissions, {
  AUTH_WITH_PERMISSIONS_KEY,
} from '@auth/decorators/auth-with-permissions.decorator';

const handlerMetadata = (decorator: MethodDecorator, key: string): unknown => {
  class TestController {
    handler() {}
  }
  const descriptor = Object.getOwnPropertyDescriptor(
    TestController.prototype,
    'handler',
  )!;
  decorator(TestController.prototype, 'handler', descriptor);

  return Reflect.getMetadata(key, descriptor.value as object);
};

describe('@Public()', () => {
  it('marks the handler as public', () => {
    expect(handlerMetadata(Public(), IS_PUBLIC_KEY)).toBe(true);
  });
});

describe('@AuthWithPermissions()', () => {
  const metadataOf = (
    options?: Parameters<typeof AuthWithPermissions>[0],
  ): unknown =>
    handlerMetadata(AuthWithPermissions(options), AUTH_WITH_PERMISSIONS_KEY);

  it('stores roles and permissions requiring all permissions by default', () => {
    expect(
      metadataOf({
        roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
        permissions: [PermissionEnum.USER_LIST, PermissionEnum.ROLE_LIST],
      }),
    ).toEqual({
      roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
      permissions: [PermissionEnum.USER_LIST, PermissionEnum.ROLE_LIST],
      mode: 'all',
    });
  });

  it('accepts only roles', () => {
    expect(metadataOf({ roles: [RoleNameEnum.SUPER_ADMIN] })).toEqual({
      roles: [RoleNameEnum.SUPER_ADMIN],
      permissions: [],
      mode: 'all',
    });
  });

  it('accepts only permissions with "any" mode', () => {
    expect(
      metadataOf({ permissions: [PermissionEnum.USER_LIST], mode: 'any' }),
    ).toEqual({
      roles: [],
      permissions: [PermissionEnum.USER_LIST],
      mode: 'any',
    });
  });

  it('can be used without options', () => {
    expect(metadataOf()).toEqual({ roles: [], permissions: [], mode: 'all' });
  });

  it('can decorate a whole controller', () => {
    @AuthWithPermissions({ roles: [RoleNameEnum.SUPER_ADMIN] })
    class TestController {}

    expect(
      Reflect.getMetadata(AUTH_WITH_PERMISSIONS_KEY, TestController),
    ).toMatchObject({ roles: [RoleNameEnum.SUPER_ADMIN] });
  });
});
