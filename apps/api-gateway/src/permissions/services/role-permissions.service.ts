import { BadRequestException, Injectable } from '@nestjs/common';
import CrudService from '@database/services/crud.service';
import RolePermissionModel from '@database/models/role-permission.model';
import RoleCategoryEnum from '@common/enums/role-category.enum';
import PermissionEnum from '@common/enums/permission.enum';
import RolesService from '../../roles/roles.service';
import RolePermissionRepository from '../repositories/role-permission.repository';
import PermissionsService from './permissions.service';

@Injectable()
export default class RolePermissionsService extends CrudService<
  RolePermissionModel,
  RolePermissionRepository
> {
  constructor(
    protected readonly repository: RolePermissionRepository,
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
  ) {
    super(repository);
  }

  public listRolePermissions = async (roleId: string) => {
    await this.rolesService.findByPk(roleId, true, { attributes: ['id'] });

    return await this.permissionsService.getRolePermissions(roleId);
  };

  public setRolePermissions = async (
    roleId: string,
    permissions: PermissionEnum[],
  ) => {
    const role = (await this.rolesService.findByPk(roleId, true, {
      attributes: ['id', 'category'],
    }))!;

    if (role.category === RoleCategoryEnum.CORE)
      throw new BadRequestException(
        'Los roles del sistema tienen todos los permisos',
      );

    const permissionIds = await this.permissionsService.resolveIds(permissions);

    await this.transaction((transaction) =>
      this.repository.replaceForRole(roleId, permissionIds, transaction),
    );

    // Después del commit: invalidar antes dejaría que otra petición
    // vuelva a cachear los permisos viejos.
    await this.permissionsService.invalidateRole(roleId);

    return await this.permissionsService.getRolePermissions(roleId);
  };
}
