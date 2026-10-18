import { Injectable } from '@nestjs/common';
import UserPasskeyModel from '@database/models/user-passkey.model';
import CrudService from '@database/services/crud.service';
import UserPasskeyRepository from '../repositories/user-passkey.repository';

@Injectable()
export default class UserPasskeysService extends CrudService<
  UserPasskeyModel,
  UserPasskeyRepository
> {
  constructor(repository: UserPasskeyRepository) {
    super(repository);
  }
}
