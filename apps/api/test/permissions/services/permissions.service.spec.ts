import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import PermissionsService, {
  PERMISSIONS_CACHE_TTL_MS,
} from '../../../src/permissions/services/permissions.service';
import PermissionRepository from '../../../src/permissions/repositories/permission.repository';
import RolePermissionRepository from '../../../src/permissions/repositories/role-permission.repository';
import OrganizationPermissionRepository from '../../../src/permissions/repositories/organization-permission.repository';

const rows = (...keys: string[]) =>
  keys.map((key) => ({ permission: { key } }));

describe('PermissionsService', () => {
  let repository: { findAll: jest.Mock };
  let rolePermissionRepository: { findAll: jest.Mock };
  let organizationPermissionRepository: { findAll: jest.Mock };
  let store: Map<string, unknown>;
  let cache: { wrap: jest.Mock; del: jest.Mock };
  let service: PermissionsService;

  beforeEach(() => {
    repository = { findAll: jest.fn().mockResolvedValue([]) };
    rolePermissionRepository = {
      findAll: jest.fn().mockResolvedValue(rows('user:list', 'user:create')),
    };
    organizationPermissionRepository = {
      findAll: jest.fn().mockResolvedValue(rows('user:list', 'role:list')),
    };

    store = new Map();
    cache = {
      wrap: jest.fn(async (key: string, load: () => Promise<unknown>) => {
        if (!store.has(key)) store.set(key, await load());
        return store.get(key);
      }),
      del: jest.fn((key: string) => Promise.resolve(store.delete(key))),
    };

    service = new PermissionsService(
      repository as unknown as PermissionRepository,
      rolePermissionRepository as unknown as RolePermissionRepository,
      organizationPermissionRepository as unknown as OrganizationPermissionRepository,
      cache as unknown as Cache,
    );
  });

  describe('listCatalog', () => {
    it('lists the catalog ordered by key', async () => {
      await service.listCatalog();

      expect(repository.findAll).toHaveBeenCalledWith(undefined, {
        attributes: ['id', 'key', 'resource', 'action', 'description'],
        order: [['key', 'ASC']],
      });
    });
  });

  describe('resolveIds', () => {
    it('returns the ids of the given keys, ignoring duplicates', async () => {
      repository.findAll.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

      await expect(
        service.resolveIds(['user:list', 'role:list', 'user:list']),
      ).resolves.toEqual(['p1', 'p2']);
      expect(repository.findAll).toHaveBeenCalledWith(
        { key: ['user:list', 'role:list'] },
        { attributes: ['id'] },
      );
    });

    it('skips the query for an empty list', async () => {
      await expect(service.resolveIds([])).resolves.toEqual([]);
      expect(repository.findAll).not.toHaveBeenCalled();
    });

    it('throws when a key is missing from the database catalog', async () => {
      repository.findAll.mockResolvedValue([{ id: 'p1' }]);

      await expect(
        service.resolveIds(['user:list', 'role:list']),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('getRolePermissions', () => {
    it('returns the permission keys of the role', async () => {
      await expect(service.getRolePermissions('role-id')).resolves.toEqual([
        'user:list',
        'user:create',
      ]);
      expect(rolePermissionRepository.findAll).toHaveBeenCalledWith(
        { roleId: 'role-id' },
        expect.anything(),
      );
    });

    it('caches by role with the configured TTL', async () => {
      await service.getRolePermissions('role-id');
      await service.getRolePermissions('role-id');

      expect(cache.wrap).toHaveBeenCalledWith(
        'permissions:role:role-id',
        expect.any(Function),
        PERMISSIONS_CACHE_TTL_MS,
      );
      expect(rolePermissionRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOrganizationPermissions', () => {
    it('returns and caches the keys of the organization', async () => {
      await expect(
        service.getOrganizationPermissions('org-id'),
      ).resolves.toEqual(['user:list', 'role:list']);
      await service.getOrganizationPermissions('org-id');

      expect(cache.wrap).toHaveBeenCalledWith(
        'permissions:organization:org-id',
        expect.any(Function),
        PERMISSIONS_CACHE_TTL_MS,
      );
      expect(organizationPermissionRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getEffectivePermissions', () => {
    it('returns the intersection of role and organization permissions', async () => {
      await expect(
        service.getEffectivePermissions('role-id', 'org-id'),
      ).resolves.toEqual(['user:list']);
    });

    it('grants nothing to a user without organization', async () => {
      await expect(
        service.getEffectivePermissions('role-id', null),
      ).resolves.toEqual([]);
      expect(rolePermissionRepository.findAll).not.toHaveBeenCalled();
    });

    it('grants nothing when the organization has nothing contracted', async () => {
      organizationPermissionRepository.findAll.mockResolvedValue([]);

      await expect(
        service.getEffectivePermissions('role-id', 'org-id'),
      ).resolves.toEqual([]);
    });
  });

  describe('invalidation', () => {
    it('invalidateRole reloads the role on the next read', async () => {
      await service.getRolePermissions('role-id');
      await service.invalidateRole('role-id');
      await service.getRolePermissions('role-id');

      expect(cache.del).toHaveBeenCalledWith('permissions:role:role-id');
      expect(rolePermissionRepository.findAll).toHaveBeenCalledTimes(2);
    });

    it('invalidateOrganization reloads the organization on the next read', async () => {
      await service.getOrganizationPermissions('org-id');
      await service.invalidateOrganization('org-id');
      await service.getOrganizationPermissions('org-id');

      expect(cache.del).toHaveBeenCalledWith('permissions:organization:org-id');
      expect(organizationPermissionRepository.findAll).toHaveBeenCalledTimes(2);
    });

    it('invalidating a role does not touch organizations', async () => {
      await service.getOrganizationPermissions('org-id');
      await service.invalidateRole('role-id');
      await service.getOrganizationPermissions('org-id');

      expect(organizationPermissionRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });
});
