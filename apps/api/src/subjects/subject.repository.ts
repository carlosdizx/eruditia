import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import SubjectModel from '@database/models/subject.model';
import { SUBJECT_NOT_FOUND_MESSAGE } from './constants/subject-messages.constant';

@Injectable()
export default class SubjectRepository extends AbstractRepository<SubjectModel> {
  constructor() {
    super(SubjectModel, {
      logger: new Logger(SubjectRepository.name),
      findByPkNotFoundMessage: SUBJECT_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: SUBJECT_NOT_FOUND_MESSAGE,
    });
  }
}
