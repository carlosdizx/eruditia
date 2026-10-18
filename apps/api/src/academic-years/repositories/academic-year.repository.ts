import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import AcademicYearModel from '@database/models/academic-year.model';
import { ACADEMIC_YEAR_NOT_FOUND_MESSAGE } from '../constants/academic-year-messages.constant';

@Injectable()
export default class AcademicYearRepository extends AbstractRepository<AcademicYearModel> {
  constructor() {
    super(AcademicYearModel, {
      logger: new Logger(AcademicYearRepository.name),
      findByPkNotFoundMessage: ACADEMIC_YEAR_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: ACADEMIC_YEAR_NOT_FOUND_MESSAGE,
    });
  }

  // Deja la organización sin año activo, antes de activar otro.
  public async deactivateAll(
    organizationId: string,
    transaction: Transaction,
  ): Promise<void> {
    try {
      await this.model.update(
        { isActive: false },
        { where: { organizationId, isActive: true }, transaction },
      );
    } catch (error) {
      this.logger.error('Error deactivating academic years');
      this.logger.error(error);
      throw new ConflictException('No se pudo cambiar el año lectivo activo');
    }
  }
}
