import { Module } from '@nestjs/common';
import UserAccountsService from '@services/user-accounts.service';

@Module({
  providers: [UserAccountsService],
  exports: [UserAccountsService],
})
export default class UserAccountsModule {}
