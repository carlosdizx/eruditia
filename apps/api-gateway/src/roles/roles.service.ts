import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import RoleModel from '@database/models/role.model';
import CrudService from '@database/services/crud.service';
import RoleNameEnum from '@common/enums/role-name.enum';
import RoleRepository from './role.repository';

@Injectable()
export default class RolesService extends CrudService<
  RoleModel,
  RoleRepository
> {
  constructor(protected readonly repository: RoleRepository) {
    super(repository);
  }

  public findByName = async (name: RoleNameEnum, transaction?: Transaction) => {
    return (await this.findOne({ name }, true, { transaction }))!;
  };
}
