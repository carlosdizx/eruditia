import { Module } from '@nestjs/common';
import AcademicYearsModule from '../academic-years/academic-years.module';
import ClassroomsModule from '../classrooms/classrooms.module';
import StudentsModule from '../students/students.module';
import EnrollmentsController from './enrollments.controller';
import EnrollmentsService from './enrollments.service';
import EnrollmentRepository from './enrollment.repository';
import StudentEnrollmentsController from './student-enrollments.controller';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import OrganizationRepository from '../organizations/organization.repository';
import PromotionsController from './promotions.controller';
import PromotionsService from './promotions.service';

@Module({
  imports: [ClassroomsModule, StudentsModule, AcademicYearsModule],
  controllers: [
    EnrollmentsController,
    StudentEnrollmentsController,
    PromotionsController,
  ],
  providers: [
    EnrollmentRepository,
    ClassroomSubjectRepository,
    OrganizationRepository,
    EnrollmentsService,
    PromotionsService,
  ],
  exports: [EnrollmentsService],
})
export default class EnrollmentsModule {}
