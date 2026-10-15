import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import AcademicPeriodModel from '@database/models/academic-period.model';
import { ACADEMIC_PERIOD_NOT_FOUND_MESSAGE } from '../constants/academic-year-messages.constant';

@Injectable()
export default class AcademicPeriodRepository extends AbstractRepository<AcademicPeriodModel> {
  constructor() {
    super(AcademicPeriodModel, {
      logger: new Logger(AcademicPeriodRepository.name),
      findByPkNotFoundMessage: ACADEMIC_PERIOD_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: ACADEMIC_PERIOD_NOT_FOUND_MESSAGE,
    });
  }

  public async closeGradingOfYear(
    academicYearId: string,
    transaction: Transaction,
  ): Promise<void> {
    try {
      await this.model.update(
        { isOpenForGrading: false },
        { where: { academicYearId }, transaction },
      );
    } catch (error) {
      this.logger.error('Error closing grading of academic periods');
      this.logger.error(error);
      throw new ConflictException('No se pudo cerrar el ingreso de notas');
    }
  }

  // Elimina (soft delete) los periodos del año que no estén en keepIds.
  public async deleteOthers(
    academicYearId: string,
    keepIds: string[],
    transaction: Transaction,
  ): Promise<void> {
    try {
      await this.model.destroy({
        where: {
          academicYearId,
          ...(keepIds.length && { id: { [Op.notIn]: keepIds } }),
        },
        transaction,
      });
    } catch (error) {
      this.logger.error('Error deleting academic periods');
      this.logger.error(error);
      throw new ConflictException('No se pudieron eliminar los periodos');
    }
  }
}
