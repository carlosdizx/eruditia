import { Module } from '@nestjs/common';
import StudentsController from './students.controller';
import StudentsService from './students.service';
import StudentRepository from './student.repository';

@Module({
  controllers: [StudentsController],
  providers: [StudentRepository, StudentsService],
  exports: [StudentsService],
})
export default class StudentsModule {}
