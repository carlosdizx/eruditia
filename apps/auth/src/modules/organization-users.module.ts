import { Module } from '@nestjs/common';
import OrganizationUsersController from '@controllers/organization-users.controller';
import OrganizationUsersService from '@services/organization-users.service';
import UserAccountsModule from '@modules/user-accounts.module';

@Module({
  imports: [UserAccountsModule],
  controllers: [OrganizationUsersController],
  providers: [OrganizationUsersService],
})
export default class OrganizationUsersModule {}
