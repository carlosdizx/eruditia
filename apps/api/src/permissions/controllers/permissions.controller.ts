import { Controller, Get } from '@nestjs/common';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import RoleNameEnum from '@common/enums/role-name.enum';
import PermissionsService from '../services/permissions.service';

@AuthWithPermissions({ roles: [RoleNameEnum.SUPER_ADMIN] })
@Controller('permissions')
export default class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  public async listCatalog() {
    return await this.permissionsService.listCatalog();
  }
}
