import { Controller, Post } from '@nestjs/common';
import UsersService from './users.service';

@Controller('users')
export default class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('super-admin')
  public async createSuperAdmin() {
    return await this.usersService.createSuperAdmin();
  }
}
