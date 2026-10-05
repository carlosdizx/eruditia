import { Controller, Get, Post, Query } from '@nestjs/common';
import UsersService from './users.service';
import Public from '@auth/decorators/public.decorator';
import PaginationDto from '@common/dto/pagination.dto';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';

@Controller('users')
export default class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post('super-admin')
  public async createSuperAdmin() {
    return await this.usersService.createSuperAdmin();
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.USER_LIST],
  })
  @Get()
  public async listUsers(
    @Query() dto: PaginationDto,
    @CurrentAuth() { organizationId }: AuthContextInterface,
  ) {
    return await this.usersService.findAllPaginated(
      dto,
      { organizationId },
      { attributes: ['id', 'firstName', 'lastName', 'email', 'isActive'] },
    );
  }
}
