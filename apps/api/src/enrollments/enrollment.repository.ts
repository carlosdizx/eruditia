import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import EnrollmentModel from '@database/models/enrollment.model';
import { ENROLLMENT_NOT_FOUND_MESSAGE } from './constants/enrollment-messages.constant';

@Injectable()
export default class EnrollmentRepository extends AbstractRepository<EnrollmentModel> {
  constructor() {
    super(EnrollmentModel, {
      logger: new Logger(EnrollmentRepository.name),
      findByPkNotFoundMessage: ENROLLMENT_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: ENROLLMENT_NOT_FOUND_MESSAGE,
    });
  }
}
