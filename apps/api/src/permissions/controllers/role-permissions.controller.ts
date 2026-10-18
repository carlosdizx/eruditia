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
import RolePermissionsService from '../services/role-permissions.service';
import SetPermissionsDto from '../dto/set-permissions.dto';

@AuthWithPermissions({ roles: [RoleNameEnum.SUPER_ADMIN] })
@Controller('roles/:roleId/permissions')
export default class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @Get()
  public async listRolePermissions(
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return await this.rolePermissionsService.listRolePermissions(roleId);
  }

  @Put()
  public async setRolePermissions(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: SetPermissionsDto,
  ) {
    return await this.rolePermissionsService.setRolePermissions(
      roleId,
      dto.permissions,
    );
  }
}
