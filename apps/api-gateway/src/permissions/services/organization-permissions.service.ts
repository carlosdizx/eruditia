import { Injectable } from '@nestjs/common';
import CrudService from '@database/services/crud.service';
import OrganizationPermissionModel from '@database/models/organization-permission.model';
import PermissionEnum from '@common/enums/permission.enum';
import OrganizationsService from '../../organizations/organizations.service';
import OrganizationPermissionRepository from '../repositories/organization-permission.repository';
import PermissionsService from './permissions.service';

@Injectable()
export default class OrganizationPermissionsService extends CrudService<
  OrganizationPermissionModel,
  OrganizationPermissionRepository
> {
  constructor(
    protected readonly repository: OrganizationPermissionRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly permissionsService: PermissionsService,
  ) {
    super(repository);
  }

  public listOrganizationPermissions = async (organizationId: string) => {
    await this.organizationsService.findByPk(organizationId, true, {
      attributes: ['id'],
    });

    return await this.permissionsService.getOrganizationPermissions(
      organizationId,
    );
  };

  public setOrganizationPermissions = async (
    organizationId: string,
    permissions: PermissionEnum[],
  ) => {
    await this.organizationsService.findByPk(organizationId, true, {
      attributes: ['id'],
    });

    const permissionIds = await this.permissionsService.resolveIds(permissions);

    await this.transaction((transaction) =>
      this.repository.replaceForOrganization(
        organizationId,
        permissionIds,
        transaction,
      ),
    );

    await this.permissionsService.invalidateOrganization(organizationId);

    return await this.permissionsService.getOrganizationPermissions(
      organizationId,
    );
  };
}
