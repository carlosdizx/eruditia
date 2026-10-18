import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import SubjectPeriodConceptModel from '@database/models/subject-period-concept.model';
import { SUBJECT_CONCEPT_NOT_FOUND_MESSAGE } from '../constants/gradebook-messages.constant';

@Injectable()
export default class SubjectPeriodConceptRepository extends AbstractRepository<SubjectPeriodConceptModel> {
  constructor() {
    super(SubjectPeriodConceptModel, {
      logger: new Logger(SubjectPeriodConceptRepository.name),
      findByPkNotFoundMessage: SUBJECT_CONCEPT_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: SUBJECT_CONCEPT_NOT_FOUND_MESSAGE,
    });
  }

  public async deleteAllOf(
    classroomSubjectId: string,
    academicPeriodId: string,
    transaction: Transaction,
  ): Promise<void> {
    try {
      await this.model.destroy({
        where: { classroomSubjectId, academicPeriodId },
        transaction,
      });
    } catch (error) {
      this.logger.error('Error deleting subject period concepts');
      this.logger.error(error);
      throw new ConflictException('No se pudieron eliminar los conceptos');
    }
  }
}
