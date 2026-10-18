import { Module } from '@nestjs/common';
import RolesModule from '../roles/roles.module';
import OrganizationsModule from '../organizations/organizations.module';
import PermissionRepository from './repositories/permission.repository';
import RolePermissionRepository from './repositories/role-permission.repository';
import OrganizationPermissionRepository from './repositories/organization-permission.repository';
import PermissionsService from './services/permissions.service';
import PermissionsCatalogService from './services/permissions-catalog.service';
import RolePermissionsService from './services/role-permissions.service';
import OrganizationPermissionsService from './services/organization-permissions.service';
import PermissionsController from './controllers/permissions.controller';
import RolePermissionsController from './controllers/role-permissions.controller';
import OrganizationPermissionsController from './controllers/organization-permissions.controller';

@Module({
  imports: [RolesModule, OrganizationsModule],
  controllers: [
    PermissionsController,
    RolePermissionsController,
    OrganizationPermissionsController,
  ],
  providers: [
    PermissionRepository,
    RolePermissionRepository,
    OrganizationPermissionRepository,
    PermissionsService,
    PermissionsCatalogService,
    RolePermissionsService,
    OrganizationPermissionsService,
  ],
  exports: [PermissionsService],
})
export default class PermissionsModule {}
