import { Injectable } from '@nestjs/common';
import { UserTwoFactorMethodModel } from '@database/models/user-two-factor-method.model';
import CrudService from '@database/services/crud.service';
import UserTwoFactorMethodRepository from '../repositories/user-two-factor-method.repository';

@Injectable()
export default class UserTwoFactorMethodsService extends CrudService<
  UserTwoFactorMethodModel,
  UserTwoFactorMethodRepository
> {
  constructor(repository: UserTwoFactorMethodRepository) {
    super(repository);
  }

  public findEnabledByUser = async (userId: string) => {
    return await this.findAll({ userId, isEnabled: true });
  };
}
