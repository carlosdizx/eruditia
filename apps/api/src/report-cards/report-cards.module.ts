import { Module } from '@nestjs/common';
import GradebooksModule from '../gradebooks/gradebooks.module';
import GradingScalesModule from '../grading-scales/grading-scales.module';
import PermissionsModule from '../permissions/permissions.module';
import RankingsModule from '../rankings/rankings.module';
import AcademicPeriodRepository from '../academic-years/repositories/academic-period.repository';
import ClassroomRepository from '../classrooms/classroom.repository';
import EnrollmentRepository from '../enrollments/enrollment.repository';
import EvaluationItemRepository from '../gradebooks/repositories/evaluation-item.repository';
import StudentGradeRepository from '../gradebooks/repositories/student-grade.repository';
import SubjectPeriodConceptRepository from '../gradebooks/repositories/subject-period-concept.repository';
import OrganizationRepository from '../organizations/organization.repository';
import StudentRepository from '../students/student.repository';
import ReportCardsController from './report-cards.controller';
import ReportCardsService from './report-cards.service';

@Module({
  imports: [
    GradebooksModule,
    GradingScalesModule,
    PermissionsModule,
    RankingsModule,
  ],
  controllers: [ReportCardsController],
  providers: [
    OrganizationRepository,
    StudentRepository,
    AcademicPeriodRepository,
    ClassroomRepository,
    EnrollmentRepository,
    EvaluationItemRepository,
    StudentGradeRepository,
    SubjectPeriodConceptRepository,
    ReportCardsService,
  ],
})
export default class ReportCardsModule {}
