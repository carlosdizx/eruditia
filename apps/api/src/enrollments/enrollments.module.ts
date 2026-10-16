import { Module } from '@nestjs/common';
import AcademicYearsModule from '../academic-years/academic-years.module';
import ClassroomsModule from '../classrooms/classrooms.module';
import StudentsModule from '../students/students.module';
import EnrollmentsController from './enrollments.controller';
import EnrollmentsService from './enrollments.service';
import EnrollmentRepository from './enrollment.repository';
import StudentEnrollmentsController from './student-enrollments.controller';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import GradingScalesModule from '../grading-scales/grading-scales.module';
import GradebooksModule from '../gradebooks/gradebooks.module';
import PromotionsController from './promotions.controller';
import PromotionsService from './promotions.service';

@Module({
  imports: [
    ClassroomsModule,
    StudentsModule,
    AcademicYearsModule,
    GradingScalesModule,
    GradebooksModule,
  ],
  controllers: [
    EnrollmentsController,
    StudentEnrollmentsController,
    PromotionsController,
  ],
  providers: [
    EnrollmentRepository,
    ClassroomSubjectRepository,
    EnrollmentsService,
    PromotionsService,
  ],
  exports: [EnrollmentsService],
})
export default class EnrollmentsModule {}
