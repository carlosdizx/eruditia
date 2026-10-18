import { Injectable } from '@nestjs/common';
import RoleModel from '@database/models/role.model';
import RoleCategoryEnum from '@common/enums/role-category.enum';
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

  // Solo los asignables dentro de una organización: los de sistema (core)
  // no se ofrecen.
  public listRoles = async () => {
    return this.findAll(
      { category: RoleCategoryEnum.CLIENT },
      { attributes: ['id', 'name', 'label', 'labelEs'] },
    );
  };
}
