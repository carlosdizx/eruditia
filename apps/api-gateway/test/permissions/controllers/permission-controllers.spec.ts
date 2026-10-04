import 'reflect-metadata';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import PermissionsController from '../../../src/permissions/controllers/permissions.controller';
import RolePermissionsController from '../../../src/permissions/controllers/role-permissions.controller';
import OrganizationPermissionsController from '../../../src/permissions/controllers/organization-permissions.controller';
import PermissionsService from '../../../src/permissions/services/permissions.service';
import RolePermissionsService from '../../../src/permissions/services/role-permissions.service';
import OrganizationPermissionsService from '../../../src/permissions/services/organization-permissions.service';

const permissions = [PermissionEnum.USER_LIST];

describe.each([
  PermissionsController,
  RolePermissionsController,
  OrganizationPermissionsController,
])('%p', (controller) => {
  it('is restricted to the SUPER_ADMIN role', () => {
    expect(Reflect.getMetadata(AUTH_WITH_PERMISSIONS_KEY, controller)).toEqual({
      roles: [RoleNameEnum.SUPER_ADMIN],
      permissions: [],
      mode: 'all',
    });
  });
});

describe('PermissionsController', () => {
  it('lists the catalog', async () => {
    const service = { listCatalog: jest.fn().mockResolvedValue([]) };
    const controller = new PermissionsController(
      service as unknown as PermissionsService,
    );

    await expect(controller.listCatalog()).resolves.toEqual([]);
  });
});

describe('RolePermissionsController', () => {
  const service = {
    listRolePermissions: jest.fn().mockResolvedValue(permissions),
    setRolePermissions: jest.fn().mockResolvedValue(permissions),
  };
  const controller = new RolePermissionsController(
    service as unknown as RolePermissionsService,
  );

  it('lists the permissions of the role', async () => {
    await expect(controller.listRolePermissions('role-id')).resolves.toEqual(
      permissions,
    );
    expect(service.listRolePermissions).toHaveBeenCalledWith('role-id');
  });

  it('sets the permissions of the role', async () => {
    await controller.setRolePermissions('role-id', { permissions });

    expect(service.setRolePermissions).toHaveBeenCalledWith(
      'role-id',
      permissions,
    );
  });
});

describe('OrganizationPermissionsController', () => {
  const service = {
    listOrganizationPermissions: jest.fn().mockResolvedValue(permissions),
    setOrganizationPermissions: jest.fn().mockResolvedValue(permissions),
  };
  const controller = new OrganizationPermissionsController(
    service as unknown as OrganizationPermissionsService,
  );

  it('lists the permissions of the organization', async () => {
    await expect(
      controller.listOrganizationPermissions('org-id'),
    ).resolves.toEqual(permissions);
    expect(service.listOrganizationPermissions).toHaveBeenCalledWith('org-id');
  });

  it('sets the permissions of the organization', async () => {
    await controller.setOrganizationPermissions('org-id', { permissions });

    expect(service.setOrganizationPermissions).toHaveBeenCalledWith(
      'org-id',
      permissions,
    );
  });
});
