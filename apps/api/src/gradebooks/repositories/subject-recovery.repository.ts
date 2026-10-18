import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import SubjectRecoveryModel from '@database/models/subject-recovery.model';
import { SUBJECT_RECOVERY_NOT_FOUND_MESSAGE } from '../constants/gradebook-messages.constant';

@Injectable()
export default class SubjectRecoveryRepository extends AbstractRepository<SubjectRecoveryModel> {
  constructor() {
    super(SubjectRecoveryModel, {
      logger: new Logger(SubjectRecoveryRepository.name),
      findByPkNotFoundMessage: SUBJECT_RECOVERY_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: SUBJECT_RECOVERY_NOT_FOUND_MESSAGE,
    });
  }
}
