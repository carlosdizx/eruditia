import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import GradingScaleModel from '@database/models/grading-scale.model';
import { GRADING_SCALE_NOT_FOUND_MESSAGE } from './constants/grading-scale-messages.constant';

@Injectable()
export default class GradingScaleRepository extends AbstractRepository<GradingScaleModel> {
  constructor() {
    super(GradingScaleModel, {
      logger: new Logger(GradingScaleRepository.name),
      findByPkNotFoundMessage: GRADING_SCALE_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: GRADING_SCALE_NOT_FOUND_MESSAGE,
    });
  }
}
