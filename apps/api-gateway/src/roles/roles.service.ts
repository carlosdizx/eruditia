import { Injectable } from '@nestjs/common';
import RoleModel from '@database/models/role.model';
import CrudService from '@database/services/crud.service';
import RoleRepository from './role.repository';
import { async } from 'rxjs';

@Injectable()
export default class RolesService extends CrudService<
  RoleModel,
  RoleRepository
> {
  constructor(protected readonly repository: RoleRepository) {
    super(repository);
  }

  public listRoles = async () => {
    return this.findAll(undefined, { attributes: ['id', 'label', 'labelEs'] });
  };
}
