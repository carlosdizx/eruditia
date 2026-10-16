import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import EvaluationItemModel from '@database/models/evaluation-item.model';
import { EVALUATION_ITEM_NOT_FOUND_MESSAGE } from '../constants/gradebook-messages.constant';

@Injectable()
export default class EvaluationItemRepository extends AbstractRepository<EvaluationItemModel> {
  constructor() {
    super(EvaluationItemModel, {
      logger: new Logger(EvaluationItemRepository.name),
      findByPkNotFoundMessage: EVALUATION_ITEM_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: EVALUATION_ITEM_NOT_FOUND_MESSAGE,
    });
  }

  // Borra las actividades de la planilla que no estén en keepIds (y sus notas,
  // por el ON DELETE CASCADE).
  public async deleteOthers(
    classroomSubjectId: string,
    academicPeriodId: string,
    keepIds: string[],
    transaction: Transaction,
  ): Promise<void> {
    try {
      await this.model.destroy({
        where: {
          classroomSubjectId,
          academicPeriodId,
          ...(keepIds.length && { id: { [Op.notIn]: keepIds } }),
        },
        transaction,
      });
    } catch (error) {
      this.logger.error('Error deleting evaluation items');
      this.logger.error(error);
      throw new ConflictException('No se pudieron eliminar las actividades');
    }
  }
}
