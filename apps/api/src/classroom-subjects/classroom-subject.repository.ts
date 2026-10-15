import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import ClassroomSubjectModel from '@database/models/classroom-subject.model';
import { CLASSROOM_SUBJECT_NOT_FOUND_MESSAGE } from './constants/classroom-subject-messages.constant';

@Injectable()
export default class ClassroomSubjectRepository extends AbstractRepository<ClassroomSubjectModel> {
  constructor() {
    super(ClassroomSubjectModel, {
      logger: new Logger(ClassroomSubjectRepository.name),
      findByPkNotFoundMessage: CLASSROOM_SUBJECT_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: CLASSROOM_SUBJECT_NOT_FOUND_MESSAGE,
    });
  }

  // Al eliminar un salón su carga académica se va con él.
  public async deleteByClassroom(
    classroomId: string,
    transaction: Transaction,
  ): Promise<void> {
    try {
      await this.model.destroy({ where: { classroomId }, transaction });
    } catch (error) {
      this.logger.error('Error deleting classroom subjects');
      this.logger.error(error);
      throw new ConflictException(
        'No se pudieron eliminar las materias del salón',
      );
    }
  }
}
