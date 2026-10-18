import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { CreationAttributes, Op, Sequelize, Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import StudentGradeModel from '@database/models/student-grade.model';
import { STUDENT_GRADE_NOT_FOUND_MESSAGE } from '../constants/gradebook-messages.constant';

@Injectable()
export default class StudentGradeRepository extends AbstractRepository<StudentGradeModel> {
  constructor() {
    super(StudentGradeModel, {
      logger: new Logger(StudentGradeRepository.name),
      findByPkNotFoundMessage: STUDENT_GRADE_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: STUDENT_GRADE_NOT_FOUND_MESSAGE,
    });
  }

  // Una nota por estudiante y actividad: si ya existe se reemplaza.
  public async upsertMany(
    grades: CreationAttributes<StudentGradeModel>[],
    transaction: Transaction,
  ): Promise<void> {
    if (!grades.length) return;
    await this.insertMany(grades, {
      transaction,
      conflictAttributes: ['evaluationItemId', 'enrollmentId'],
      updateOnDuplicate: ['score', 'feedback', 'updatedBy', 'updatedAt'],
    });
  }

  public async deleteMany(
    keys: { enrollmentId: string; evaluationItemId: string }[],
    transaction: Transaction,
  ): Promise<void> {
    if (!keys.length) return;
    try {
      await this.model.destroy({ where: { [Op.or]: keys }, transaction });
    } catch (error) {
      this.logger.error('Error deleting student grades');
      this.logger.error(error);
      throw new ConflictException('No se pudieron borrar las notas');
    }
  }

  // Alguna nota de la organización que no cabría en la escala dada.
  public async findOutsideScale(
    organizationId: string,
    {
      minScore,
      maxScore,
      decimalPlaces,
    }: { minScore: number; maxScore: number; decimalPlaces: number },
  ): Promise<StudentGradeModel | null> {
    const factor = 10 ** decimalPlaces;
    return await this.findOne(
      {
        organizationId,
        [Op.or]: [
          { score: { [Op.lt]: minScore } },
          { score: { [Op.gt]: maxScore } },
          Sequelize.literal(`score * ${factor} <> TRUNC(score * ${factor})`),
        ],
      },
      false,
      { attributes: ['id', 'score'] },
    );
  }
}
