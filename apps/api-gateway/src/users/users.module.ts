import { Module } from '@nestjs/common';
import OrganizationsModule from '../organizations/organizations.module';
import UsersService from './users.service';
import UserRepository from './user.repository';

@Module({
  imports: [OrganizationsModule],
  providers: [UserRepository, UsersService],
  exports: [UsersService],
})
export default class UsersModule {}
