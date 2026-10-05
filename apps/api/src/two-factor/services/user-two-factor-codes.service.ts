import { Injectable } from '@nestjs/common';
import UserTwoFactorCodeModel from '@database/models/user-two-factor-code.model';
import CrudService from '@database/services/crud.service';
import UserTwoFactorCodeRepository from '../repositories/user-two-factor-code.repository';

@Injectable()
export default class UserTwoFactorCodesService extends CrudService<
  UserTwoFactorCodeModel,
  UserTwoFactorCodeRepository
> {
  constructor(repository: UserTwoFactorCodeRepository) {
    super(repository);
  }
}
