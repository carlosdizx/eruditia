import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { Op } from 'sequelize';
import PermissionEnum from '@common/enums/permission.enum';
import PermissionsCatalogService from '../../../src/permissions/services/permissions-catalog.service';
import PermissionRepository from '../../../src/permissions/repositories/permission.repository';
import permissionCatalog from '../../../src/permissions/permission-catalog';

describe('PermissionsCatalogService', () => {
  let repository: { upsertCatalog: jest.Mock; findAll: jest.Mock };
  let service: PermissionsCatalogService;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {});
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    repository = {
      upsertCatalog: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn().mockResolvedValue([]),
    };
    service = new PermissionsCatalogService(
      repository as unknown as PermissionRepository,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('syncs the catalog on application bootstrap', async () => {
    await service.onApplicationBootstrap();

    expect(repository.upsertCatalog).toHaveBeenCalledWith(permissionCatalog());
  });

  it('looks for permissions removed from the enum', async () => {
    await service.sync();

    expect(repository.findAll).toHaveBeenCalledWith(
      { key: { [Op.notIn]: Object.values(PermissionEnum) } },
      { attributes: ['key'] },
    );
  });

  it('warns about orphan permissions without deleting them', async () => {
    repository.findAll.mockResolvedValue([{ key: 'legacy:old' }]);

    await service.sync();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('legacy:old'));
  });

  it('does not warn when the catalog is in sync', async () => {
    await service.sync();

    expect(warn).not.toHaveBeenCalled();
  });

  it('propagates sync errors so the app does not start half configured', async () => {
    const error = new Error('db down');
    repository.upsertCatalog.mockRejectedValue(error);

    await expect(service.onApplicationBootstrap()).rejects.toBe(error);
  });
});
