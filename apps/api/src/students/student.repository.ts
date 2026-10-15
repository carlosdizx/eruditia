import { Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import StudentModel from '@database/models/student.model';
import { STUDENT_NOT_FOUND_MESSAGE } from './constants/student-messages.constant';

@Injectable()
export default class StudentRepository extends AbstractRepository<StudentModel> {
  constructor() {
    super(StudentModel, {
      logger: new Logger(StudentRepository.name),
      findByPkNotFoundMessage: STUDENT_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: STUDENT_NOT_FOUND_MESSAGE,
    });
  }
}
