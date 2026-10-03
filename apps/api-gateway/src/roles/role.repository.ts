import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import RoleModel from '@database/models/role.model';

@Injectable()
export default class RoleRepository extends AbstractRepository<RoleModel> {
  constructor() {
    super(RoleModel, {
      logger: new Logger(RoleRepository.name),
      findByPkNotFoundMessage: 'Rol no encontrado',
      findOneNotFoundMessage: 'Rol no encontrado',
    });
  }
}
