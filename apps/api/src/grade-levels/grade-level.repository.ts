import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import GradeLevelModel from '@database/models/grade-level.model';
import { GRADE_LEVEL_NOT_FOUND_MESSAGE } from './constants/grade-level-messages.constant';

@Injectable()
export default class GradeLevelRepository extends AbstractRepository<GradeLevelModel> {
  constructor() {
    super(GradeLevelModel, {
      logger: new Logger(GradeLevelRepository.name),
      findByPkNotFoundMessage: GRADE_LEVEL_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: GRADE_LEVEL_NOT_FOUND_MESSAGE,
    });
  }
}
