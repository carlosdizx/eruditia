import { Injectable } from '@nestjs/common';
import RoleModel from '@database/models/role.model';
import CrudService from '@database/services/crud.service';
import RoleRepository from './role.repository';

@Injectable()
export default class RolesService extends CrudService<
  RoleModel,
  RoleRepository
> {
  constructor(protected readonly repository: RoleRepository) {
    super(repository);
  }
}
