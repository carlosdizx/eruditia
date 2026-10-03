import { Module } from '@nestjs/common';
import OrganizationsModule from '../organizations/organizations.module';
import RolesModule from '../roles/roles.module';
import UsersService from './users.service';
import UserRepository from './user.repository';

@Module({
  imports: [OrganizationsModule],
  imports: [OrganizationsModule, RolesModule],
  providers: [UserRepository, UsersService],
  exports: [UsersService],
})
export default class UsersModule {}
