import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import PermissionModel from '@database/models/permission.model';
import RolePermissionModel from '@database/models/role-permission.model';
import OrganizationPermissionModel from '@database/models/organization-permission.model';
import PermissionEnum from '@common/enums/permission.enum';
import PermissionRepository from '../../../src/permissions/repositories/permission.repository';
import RolePermissionRepository from '../../../src/permissions/repositories/role-permission.repository';
import OrganizationPermissionRepository from '../../../src/permissions/repositories/organization-permission.repository';

const transaction = { id: 'tx' } as unknown as Transaction;

afterEach(() => {
  jest.restoreAllMocks();
});

describe('PermissionRepository', () => {
  let repository: PermissionRepository;
  let bulkCreate: jest.SpyInstance;

  const entries = [
    {
      key: PermissionEnum.USER_LIST,
      resource: 'user',
      action: 'list',
      description: 'Listar',
    },
  ];

  beforeEach(() => {
    repository = new PermissionRepository();
    repository.unassignLoggerError();
    bulkCreate = jest
      .spyOn(PermissionModel, 'bulkCreate')
      .mockResolvedValue([]);
  });

  it('upserts the catalog by key', async () => {
    await repository.upsertCatalog(entries);

    expect(bulkCreate).toHaveBeenCalledWith(entries, {
      conflictAttributes: ['key'],
      updateOnDuplicate: ['resource', 'action', 'description', 'updatedAt'],
    });
  });

  it('wraps database errors in a ConflictException', async () => {
    bulkCreate.mockRejectedValue(new Error('db down'));

    await expect(repository.upsertCatalog(entries)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('RolePermissionRepository', () => {
  let repository: RolePermissionRepository;
  let destroy: jest.SpyInstance;
  let bulkCreate: jest.SpyInstance;

  beforeEach(() => {
    repository = new RolePermissionRepository();
    repository.unassignLoggerError();
    destroy = jest.spyOn(RolePermissionModel, 'destroy').mockResolvedValue(2);
    bulkCreate = jest
      .spyOn(RolePermissionModel, 'bulkCreate')
      .mockResolvedValue([]);
  });

  it('replaces every permission of the role inside the transaction', async () => {
    await repository.replaceForRole('role-id', ['p1', 'p2'], transaction);

    expect(destroy).toHaveBeenCalledWith({
      where: { roleId: 'role-id' },
      transaction,
    });
    expect(bulkCreate).toHaveBeenCalledWith(
      [
        { roleId: 'role-id', permissionId: 'p1' },
        { roleId: 'role-id', permissionId: 'p2' },
      ],
      { transaction },
    );
    expect(destroy.mock.invocationCallOrder[0]).toBeLessThan(
      bulkCreate.mock.invocationCallOrder[0],
    );
  });

  it('wraps database errors in a ConflictException', async () => {
    destroy.mockRejectedValue(new Error('db down'));

    await expect(
      repository.replaceForRole('role-id', [], transaction),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('OrganizationPermissionRepository', () => {
  let repository: OrganizationPermissionRepository;
  let destroy: jest.SpyInstance;
  let bulkCreate: jest.SpyInstance;

  beforeEach(() => {
    repository = new OrganizationPermissionRepository();
    repository.unassignLoggerError();
    destroy = jest
      .spyOn(OrganizationPermissionModel, 'destroy')
      .mockResolvedValue(2);
    bulkCreate = jest
      .spyOn(OrganizationPermissionModel, 'bulkCreate')
      .mockResolvedValue([]);
  });

  it('replaces every permission of the organization inside the transaction', async () => {
    await repository.replaceForOrganization('org-id', ['p1'], transaction);

    expect(destroy).toHaveBeenCalledWith({
      where: { organizationId: 'org-id' },
      transaction,
    });
    expect(bulkCreate).toHaveBeenCalledWith(
      [{ organizationId: 'org-id', permissionId: 'p1' }],
      { transaction },
    );
  });

  it('wraps database errors in a ConflictException', async () => {
    bulkCreate.mockRejectedValue(new Error('db down'));

    await expect(
      repository.replaceForOrganization('org-id', ['p1'], transaction),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
