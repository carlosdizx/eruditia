import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import RoleCategoryEnum from '@common/enums/role-category.enum';
import PermissionEnum from '@common/enums/permission.enum';
import RolePermissionsService from '../../../src/permissions/services/role-permissions.service';
import OrganizationPermissionsService from '../../../src/permissions/services/organization-permissions.service';
import PermissionsService from '../../../src/permissions/services/permissions.service';
import RolePermissionRepository from '../../../src/permissions/repositories/role-permission.repository';
import OrganizationPermissionRepository from '../../../src/permissions/repositories/organization-permission.repository';
import RolesService from '../../../src/roles/roles.service';
import OrganizationsService from '../../../src/organizations/organizations.service';

const transaction = { id: 'tx' } as unknown as Transaction;
const permissions = [PermissionEnum.USER_LIST, PermissionEnum.ROLE_LIST];

const permissionsServiceMock = () => ({
  resolveIds: jest.fn().mockResolvedValue(['p1', 'p2']),
  getRolePermissions: jest.fn().mockResolvedValue(permissions),
  getOrganizationPermissions: jest.fn().mockResolvedValue(permissions),
  invalidateRole: jest.fn().mockResolvedValue(undefined),
  invalidateOrganization: jest.fn().mockResolvedValue(undefined),
});

const repositoryMock = (method: string): Record<string, jest.Mock> => ({
  [method]: jest.fn().mockResolvedValue(undefined),
  transaction: jest.fn((run: (tx: Transaction) => unknown) => run(transaction)),
});

describe('RolePermissionsService', () => {
  let repository: ReturnType<typeof repositoryMock>;
  let rolesService: { findByPk: jest.Mock };
  let permissionsService: ReturnType<typeof permissionsServiceMock>;
  let service: RolePermissionsService;

  beforeEach(() => {
    repository = repositoryMock('replaceForRole');
    rolesService = {
      findByPk: jest.fn().mockResolvedValue({
        id: 'role-id',
        category: RoleCategoryEnum.CLIENT,
      }),
    };
    permissionsService = permissionsServiceMock();
    service = new RolePermissionsService(
      repository as unknown as RolePermissionRepository,
      rolesService as unknown as RolesService,
      permissionsService as unknown as PermissionsService,
    );
  });

  describe('listRolePermissions', () => {
    it('validates the role exists and returns its permissions', async () => {
      await expect(service.listRolePermissions('role-id')).resolves.toEqual(
        permissions,
      );
      expect(rolesService.findByPk).toHaveBeenCalledWith('role-id', true, {
        attributes: ['id'],
      });
    });

    it('propagates NotFoundException for an unknown role', async () => {
      rolesService.findByPk.mockRejectedValue(new NotFoundException());

      await expect(
        service.listRolePermissions('role-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('setRolePermissions', () => {
    it('replaces the permissions inside a transaction', async () => {
      await service.setRolePermissions('role-id', permissions);

      expect(permissionsService.resolveIds).toHaveBeenCalledWith(permissions);
      expect(repository.replaceForRole).toHaveBeenCalledWith(
        'role-id',
        ['p1', 'p2'],
        transaction,
      );
    });

    it('invalidates the role cache only after the transaction', async () => {
      await service.setRolePermissions('role-id', permissions);

      expect(permissionsService.invalidateRole).toHaveBeenCalledWith('role-id');
      expect(
        repository.replaceForRole.mock.invocationCallOrder[0],
      ).toBeLessThan(
        permissionsService.invalidateRole.mock.invocationCallOrder[0],
      );
    });

    it('does not invalidate when the write fails', async () => {
      repository.replaceForRole.mockRejectedValue(new Error('db down'));

      await expect(
        service.setRolePermissions('role-id', permissions),
      ).rejects.toBeDefined();
      expect(permissionsService.invalidateRole).not.toHaveBeenCalled();
    });

    it('returns the fresh permissions of the role', async () => {
      await expect(
        service.setRolePermissions('role-id', permissions),
      ).resolves.toEqual(permissions);
    });

    it('rejects editing a core role', async () => {
      rolesService.findByPk.mockResolvedValue({
        id: 'role-id',
        category: RoleCategoryEnum.CORE,
      });

      await expect(
        service.setRolePermissions('role-id', permissions),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.replaceForRole).not.toHaveBeenCalled();
    });
  });
});

describe('OrganizationPermissionsService', () => {
  let repository: ReturnType<typeof repositoryMock>;
  let organizationsService: { findByPk: jest.Mock };
  let permissionsService: ReturnType<typeof permissionsServiceMock>;
  let service: OrganizationPermissionsService;

  beforeEach(() => {
    repository = repositoryMock('replaceForOrganization');
    organizationsService = {
      findByPk: jest.fn().mockResolvedValue({ id: 'org-id' }),
    };
    permissionsService = permissionsServiceMock();
    service = new OrganizationPermissionsService(
      repository as unknown as OrganizationPermissionRepository,
      organizationsService as unknown as OrganizationsService,
      permissionsService as unknown as PermissionsService,
    );
  });

  it('lists the permissions of an existing organization', async () => {
    await expect(
      service.listOrganizationPermissions('org-id'),
    ).resolves.toEqual(permissions);
    expect(organizationsService.findByPk).toHaveBeenCalledWith('org-id', true, {
      attributes: ['id'],
    });
  });

  it('replaces the permissions and invalidates after the transaction', async () => {
    await expect(
      service.setOrganizationPermissions('org-id', permissions),
    ).resolves.toEqual(permissions);

    expect(repository.replaceForOrganization).toHaveBeenCalledWith(
      'org-id',
      ['p1', 'p2'],
      transaction,
    );
    expect(
      repository.replaceForOrganization.mock.invocationCallOrder[0],
    ).toBeLessThan(
      permissionsService.invalidateOrganization.mock.invocationCallOrder[0],
    );
  });

  it('does not write for an unknown organization', async () => {
    organizationsService.findByPk.mockRejectedValue(new NotFoundException());

    await expect(
      service.setOrganizationPermissions('org-id', permissions),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.replaceForOrganization).not.toHaveBeenCalled();
  });
});
