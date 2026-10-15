import { Module } from '@nestjs/common';
import ClassroomsModule from '../classrooms/classrooms.module';
import StudentsModule from '../students/students.module';
import EnrollmentsController from './enrollments.controller';
import EnrollmentsService from './enrollments.service';
import EnrollmentRepository from './enrollment.repository';

@Module({
  imports: [ClassroomsModule, StudentsModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentRepository, EnrollmentsService],
  exports: [EnrollmentsService],
})
export default class EnrollmentsModule {}
