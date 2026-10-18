import { Module } from '@nestjs/common';
import UserTwoFactorMethodRepository from './repositories/user-two-factor-method.repository';
import UserPasskeyRepository from './repositories/user-passkey.repository';
import UserTwoFactorCodeRepository from './repositories/user-two-factor-code.repository';
import UserTwoFactorMethodsService from './services/user-two-factor-methods.service';
import UserPasskeysService from './services/user-passkeys.service';
import UserTwoFactorCodesService from './services/user-two-factor-codes.service';

@Module({
  providers: [
    UserTwoFactorMethodRepository,
    UserPasskeyRepository,
    UserTwoFactorCodeRepository,
    UserTwoFactorMethodsService,
    UserPasskeysService,
    UserTwoFactorCodesService,
  ],
  exports: [
    UserTwoFactorMethodsService,
    UserPasskeysService,
    UserTwoFactorCodesService,
  ],
})
export default class TwoFactorModule {}
