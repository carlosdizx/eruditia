import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import ClassroomModel from '@database/models/classroom.model';
import { CLASSROOM_NOT_FOUND_MESSAGE } from './constants/classroom-messages.constant';

@Injectable()
export default class ClassroomRepository extends AbstractRepository<ClassroomModel> {
  constructor() {
    super(ClassroomModel, {
      logger: new Logger(ClassroomRepository.name),
      findByPkNotFoundMessage: CLASSROOM_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: CLASSROOM_NOT_FOUND_MESSAGE,
    });
  }
}
