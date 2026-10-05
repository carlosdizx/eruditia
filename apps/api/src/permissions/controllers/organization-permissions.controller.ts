import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import RoleNameEnum from '@common/enums/role-name.enum';
import OrganizationPermissionsService from '../services/organization-permissions.service';
import SetPermissionsDto from '../dto/set-permissions.dto';

@AuthWithPermissions({ roles: [RoleNameEnum.SUPER_ADMIN] })
@Controller('organizations/:organizationId/permissions')
export default class OrganizationPermissionsController {
  constructor(
    private readonly organizationPermissionsService: OrganizationPermissionsService,
  ) {}

  @Get()
  public async listOrganizationPermissions(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return await this.organizationPermissionsService.listOrganizationPermissions(
      organizationId,
    );
  }

  @Put()
  public async setOrganizationPermissions(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: SetPermissionsDto,
  ) {
    return await this.organizationPermissionsService.setOrganizationPermissions(
      organizationId,
      dto.permissions,
    );
  }
}
