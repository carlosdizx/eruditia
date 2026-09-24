import { Module } from '@nestjs/common';
import SystemOrganizationsController from '@controllers/system-organizations.controller';
import SystemOrganizationsService from '@services/system-organizations.service';
import UserAccountsModule from '@modules/user-accounts.module';

@Module({
  imports: [UserAccountsModule],
  controllers: [SystemOrganizationsController],
  providers: [SystemOrganizationsService],
})
export default class SystemOrganizationsModule {}
