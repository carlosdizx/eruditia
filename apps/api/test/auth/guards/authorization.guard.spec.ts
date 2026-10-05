import 'reflect-metadata';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import RoleCategoryEnum from '@common/enums/role-category.enum';
import AuthorizationGuard from '@auth/guards/authorization.guard';
import Public from '@auth/decorators/public.decorator';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import AuthContextInterface from '@auth/interfaces/auth-context.interface';
import {
  MISSING_PERMISSION_MESSAGE,
  MISSING_ROLE_MESSAGE,
} from '@auth/constants/auth-messages.constant';
import PermissionsService from '../../../src/permissions/services/permissions.service';
import authContextFixture from '../fixtures/auth-context.fixture';

const { ADMIN, TEACHER, SUPER_ADMIN } = RoleNameEnum;
const { USER_LIST, USER_CREATE, ROLE_LIST } = PermissionEnum;

class TestController {
  @Public()
  publicHandler() {}

  plainHandler() {}

  @AuthWithPermissions({ roles: [ADMIN, TEACHER] })
  rolesHandler() {}

  @AuthWithPermissions({ roles: [SUPER_ADMIN] })
  superAdminHandler() {}

  @AuthWithPermissions({ permissions: [USER_LIST, USER_CREATE] })
  allPermissionsHandler() {}

  @AuthWithPermissions({ permissions: [USER_LIST, ROLE_LIST], mode: 'any' })
  anyPermissionHandler() {}

  @AuthWithPermissions({ roles: [ADMIN], permissions: [USER_CREATE] })
  roleAndPermissionHandler() {}
}

@AuthWithPermissions({ roles: [ADMIN] })
class AdminController {
  plainHandler() {}

  @AuthWithPermissions({ permissions: [USER_LIST] })
  userListHandler() {}
}

const contextFor = (
  controller: { prototype: object },
  handlerName: string,
  auth?: AuthContextInterface,
) =>
  ({
    getHandler: () =>
      (controller.prototype as Record<string, unknown>)[handlerName],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ auth }) }),
  }) as unknown as ExecutionContext;

describe('AuthorizationGuard', () => {
  let permissionsService: { getEffectivePermissions: jest.Mock };
  let guard: AuthorizationGuard;

  const admin = authContextFixture({ roleName: ADMIN });
  const student = authContextFixture({ roleName: RoleNameEnum.STUDENT });
  const superAdmin = authContextFixture({
    roleName: SUPER_ADMIN,
    roleCategory: RoleCategoryEnum.CORE,
    organizationId: null,
  });
  // Un rol de sistema que todavía no existe en RoleNameEnum.
  const hyperMegaAdmin = authContextFixture({
    roleName: 'HYPER_MEGA_ADMIN',
    roleCategory: RoleCategoryEnum.CORE,
    organizationId: null,
  });

  const grant = (...permissions: PermissionEnum[]) =>
    permissionsService.getEffectivePermissions.mockResolvedValue(permissions);

  const run = (handler: string, auth?: AuthContextInterface) =>
    guard.canActivate(contextFor(TestController, handler, auth));

  const expectForbidden = async (
    promise: Promise<boolean>,
    message: string,
  ) => {
    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).message).toBe(message);
  };

  beforeEach(() => {
    permissionsService = {
      getEffectivePermissions: jest.fn().mockResolvedValue([]),
    };
    guard = new AuthorizationGuard(
      new Reflector(),
      permissionsService as unknown as PermissionsService,
    );
  });

  it('lets public endpoints through without auth', async () => {
    await expect(run('publicHandler')).resolves.toBe(true);
  });

  it('only requires authentication without @AuthWithPermissions', async () => {
    await expect(run('plainHandler', student)).resolves.toBe(true);
    expect(permissionsService.getEffectivePermissions).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when a protected endpoint has no auth', async () => {
    await expect(run('rolesHandler')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  describe('roles', () => {
    it('allows any of the listed roles', async () => {
      await expect(run('rolesHandler', admin)).resolves.toBe(true);
      await expect(
        run('rolesHandler', authContextFixture({ roleName: TEACHER })),
      ).resolves.toBe(true);
    });

    it('rejects a role that is not listed', async () => {
      await expectForbidden(run('rolesHandler', student), MISSING_ROLE_MESSAGE);
    });

    it('does not load permissions when only roles are required', async () => {
      await run('rolesHandler', admin);

      expect(permissionsService.getEffectivePermissions).not.toHaveBeenCalled();
    });

    it('allows the super admin where it is listed', async () => {
      await expect(run('superAdminHandler', superAdmin)).resolves.toBe(true);
    });

    it('does not let other core roles in unless they are listed', async () => {
      await expectForbidden(
        run('superAdminHandler', hyperMegaAdmin),
        MISSING_ROLE_MESSAGE,
      );
    });

    it('applies to core roles too: no implicit super user', async () => {
      await expectForbidden(
        run('rolesHandler', superAdmin),
        MISSING_ROLE_MESSAGE,
      );
    });
  });

  describe('permissions', () => {
    it('loads the effective permissions of the role in the organization', async () => {
      grant(USER_LIST, USER_CREATE);

      await run('allPermissionsHandler', admin);

      expect(permissionsService.getEffectivePermissions).toHaveBeenCalledWith(
        'role-id',
        'org-id',
      );
    });

    it('"all" mode requires every permission', async () => {
      grant(USER_LIST);
      await expectForbidden(
        run('allPermissionsHandler', admin),
        MISSING_PERMISSION_MESSAGE,
      );

      grant(USER_LIST, USER_CREATE);
      await expect(run('allPermissionsHandler', admin)).resolves.toBe(true);
    });

    it('"any" mode requires at least one permission', async () => {
      grant(USER_CREATE);
      await expectForbidden(
        run('anyPermissionHandler', admin),
        MISSING_PERMISSION_MESSAGE,
      );

      grant(ROLE_LIST);
      await expect(run('anyPermissionHandler', admin)).resolves.toBe(true);
    });

    it.each([
      ['super admin', superAdmin],
      ['any other core role', hyperMegaAdmin],
    ])(
      'the %s skips the permission check without loading them',
      async (_label, auth) => {
        await expect(run('allPermissionsHandler', auth)).resolves.toBe(true);
        expect(
          permissionsService.getEffectivePermissions,
        ).not.toHaveBeenCalled();
      },
    );
  });

  describe('roles and permissions together', () => {
    it('requires both', async () => {
      grant(USER_CREATE);
      await expect(run('roleAndPermissionHandler', admin)).resolves.toBe(true);

      grant();
      await expectForbidden(
        run('roleAndPermissionHandler', admin),
        MISSING_PERMISSION_MESSAGE,
      );
    });

    it('checks the role first, without loading permissions', async () => {
      grant(USER_CREATE);

      await expectForbidden(
        run('roleAndPermissionHandler', student),
        MISSING_ROLE_MESSAGE,
      );
      expect(permissionsService.getEffectivePermissions).not.toHaveBeenCalled();
    });

    it('core roles still need to be in the role list', async () => {
      await expectForbidden(
        run('roleAndPermissionHandler', superAdmin),
        MISSING_ROLE_MESSAGE,
      );
    });
  });

  describe('controller-level requirements', () => {
    const runAdmin = (handler: string, auth: AuthContextInterface) =>
      guard.canActivate(contextFor(AdminController, handler, auth));

    it('apply to handlers without their own decorator', async () => {
      await expect(runAdmin('plainHandler', admin)).resolves.toBe(true);
      await expectForbidden(
        runAdmin('plainHandler', student),
        MISSING_ROLE_MESSAGE,
      );
    });

    it('are combined with the handler requirements', async () => {
      grant(USER_LIST);
      await expect(runAdmin('userListHandler', admin)).resolves.toBe(true);

      await expectForbidden(
        runAdmin('userListHandler', student),
        MISSING_ROLE_MESSAGE,
      );

      grant();
      await expectForbidden(
        runAdmin('userListHandler', admin),
        MISSING_PERMISSION_MESSAGE,
      );
    });
  });
});
