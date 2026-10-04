import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import CrudService from '@database/services/crud.service';
import PermissionModel from '@database/models/permission.model';
import PermissionRepository from '../repositories/permission.repository';
import RolePermissionRepository from '../repositories/role-permission.repository';
import OrganizationPermissionRepository from '../repositories/organization-permission.repository';
import {
  organizationPermissionsCacheKey,
  rolePermissionsCacheKey,
} from '../utils/permissions-cache-key.util';

// Las escrituras invalidan su llave; el TTL solo cubre a otras instancias
// mientras la caché sea en memoria.
export const PERMISSIONS_CACHE_TTL_MS = 5 * 60 * 1000;

const PERMISSION_KEY_INCLUDE = {
  attributes: ['id'],
  include: [{ model: PermissionModel, attributes: ['key'] }],
};

@Injectable()
export default class PermissionsService extends CrudService<
  PermissionModel,
  PermissionRepository
> {
  constructor(
    protected readonly repository: PermissionRepository,
    private readonly rolePermissionRepository: RolePermissionRepository,
    private readonly organizationPermissionRepository: OrganizationPermissionRepository,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    super(repository);
  }

  public listCatalog = async () => {
    return await this.findAll(undefined, {
      attributes: ['id', 'key', 'resource', 'action', 'description'],
      order: [['key', 'ASC']],
    });
  };

  public resolveIds = async (keys: string[]): Promise<string[]> => {
    const uniqueKeys = [...new Set(keys)];
    if (!uniqueKeys.length) return [];

    const permissions = await this.findAll(
      { key: uniqueKeys },
      { attributes: ['id'] },
    );

    // El DTO ya valida contra el enum: solo falla si el catálogo no se sincronizó.
    if (permissions.length !== uniqueKeys.length)
      throw new ConflictException(
        'El catálogo de permisos está desactualizado',
      );

    return permissions.map(({ id }) => id);
  };

  public getRolePermissions = (roleId: string): Promise<string[]> =>
    this.cache.wrap(
      rolePermissionsCacheKey(roleId),
      async () => {
        const rows = await this.rolePermissionRepository.findAll(
          { roleId },
          PERMISSION_KEY_INCLUDE,
        );
        return rows.map(({ permission }) => permission!.key);
      },
      PERMISSIONS_CACHE_TTL_MS,
    );

  public getOrganizationPermissions = (
    organizationId: string,
  ): Promise<string[]> =>
    this.cache.wrap(
      organizationPermissionsCacheKey(organizationId),
      async () => {
        const rows = await this.organizationPermissionRepository.findAll(
          { organizationId },
          PERMISSION_KEY_INCLUDE,
        );
        return rows.map(({ permission }) => permission!.key);
      },
      PERMISSIONS_CACHE_TTL_MS,
    );

  // Efectivo = lo que el rol permite ∩ lo que la organización tiene contratado.
  public getEffectivePermissions = async (
    roleId: string,
    organizationId: string | null,
  ): Promise<string[]> => {
    if (!organizationId) return [];

    const [rolePermissions, organizationPermissions] = await Promise.all([
      this.getRolePermissions(roleId),
      this.getOrganizationPermissions(organizationId),
    ]);

    const contracted = new Set(organizationPermissions);
    return rolePermissions.filter((key) => contracted.has(key));
  };

  public invalidateRole = async (roleId: string) => {
    await this.cache.del(rolePermissionsCacheKey(roleId));
  };

  public invalidateOrganization = async (organizationId: string) => {
    await this.cache.del(organizationPermissionsCacheKey(organizationId));
  };
}
