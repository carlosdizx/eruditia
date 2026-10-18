import { Controller, Get } from '@nestjs/common';
import RolesService from './roles.service';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';

@Controller('roles')
export default class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // Quien crea o edita usuarios necesita elegir su rol aunque no tenga
  // role:list.
  @AuthWithPermissions({
    permissions: [
      PermissionEnum.ROLE_LIST,
      PermissionEnum.USER_CREATE,
      PermissionEnum.USER_UPDATE,
    ],
    mode: 'any',
  })
  @Get()
  public async getRoles() {
    return await this.rolesService.listRoles();
  }
}
