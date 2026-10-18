import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import OrganizationModel from '@database/models/organization.model';

@Injectable()
export default class OrganizationRepository extends AbstractRepository<OrganizationModel> {
  constructor() {
    super(OrganizationModel, {
      logger: new Logger(OrganizationRepository.name),
      findByPkNotFoundMessage: 'Organización no encontrada',
      findOneNotFoundMessage: 'Organización no encontrada',
    });
  }
}
