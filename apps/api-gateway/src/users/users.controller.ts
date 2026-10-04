import { Controller, Post } from '@nestjs/common';
import UsersService from './users.service';
import Public from '@auth/decorators/public.decorator';

@Controller('users')
export default class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Bootstrap del sistema; responde 409 si el super admin ya existe.
  @Public()
  @Post('super-admin')
  public async createSuperAdmin() {
    return await this.usersService.createSuperAdmin();
  }
}
