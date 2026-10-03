import { Module } from '@nestjs/common';
import RolesModule from '../roles/roles.module';
import UsersService from './users.service';
import UserRepository from './user.repository';
import UsersController from './users.controller';

@Module({
  imports: [RolesModule],
  controllers: [UsersController],
  providers: [UserRepository, UsersService],
  exports: [UsersService],
})
export default class UsersModule {}
