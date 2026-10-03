import { Controller, Get } from '@nestjs/common';
import RolesService from './roles.service';

@Controller('roles')
export default class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  public async getRoles() {
    return await this.rolesService.listRoles();
  }
}
