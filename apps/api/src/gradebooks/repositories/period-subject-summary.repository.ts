import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { CreationAttributes, Op, Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import PeriodSubjectSummaryModel from '@database/models/period-subject-summary.model';
import { PERIOD_SUMMARY_NOT_FOUND_MESSAGE } from '../constants/gradebook-messages.constant';

@Injectable()
export default class PeriodSubjectSummaryRepository extends AbstractRepository<PeriodSubjectSummaryModel> {
  constructor() {
    super(PeriodSubjectSummaryModel, {
      logger: new Logger(PeriodSubjectSummaryRepository.name),
      findByPkNotFoundMessage: PERIOD_SUMMARY_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: PERIOD_SUMMARY_NOT_FOUND_MESSAGE,
    });
  }

  // Una definitiva por estudiante, materia y periodo.
  public async upsertMany(
    summaries: CreationAttributes<PeriodSubjectSummaryModel>[],
    transaction: Transaction,
  ): Promise<void> {
    if (!summaries.length) return;
    await this.insertMany(summaries, {
      transaction,
      conflictAttributes: [
        'classroomSubjectId',
        'academicPeriodId',
        'enrollmentId',
      ],
      updateOnDuplicate: [
        'finalPeriodScore',
        'isPassed',
        'teacherObservation',
        'updatedAt',
      ],
    });
  }

  // Al cambiar la nota aprobatoria se reevalúa el estado de cada definitiva.
  public async refreshPassed(
    organizationId: string,
    passingScore: number,
    transaction: Transaction,
  ): Promise<void> {
    try {
      await this.model.update(
        {
          isPassed: this.model.sequelize!.literal(
            `final_period_score >= ${this.model.sequelize!.escape(passingScore)}`,
          ) as unknown as boolean,
        },
        {
          where: { organizationId, finalPeriodScore: { [Op.ne]: null } },
          transaction,
        },
      );
    } catch (error) {
      this.logger.error('Error refreshing passed summaries');
      this.logger.error(error);
      throw new ConflictException('No se pudieron actualizar las definitivas');
    }
  }
}
