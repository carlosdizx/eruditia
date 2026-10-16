import { Module } from '@nestjs/common';
import GradingScalesModule from '../grading-scales/grading-scales.module';
import PermissionsModule from '../permissions/permissions.module';
import AcademicPeriodRepository from '../academic-years/repositories/academic-period.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../enrollments/enrollment.repository';
import EvaluationItemRepository from '../gradebooks/repositories/evaluation-item.repository';
import PeriodSubjectSummaryRepository from '../gradebooks/repositories/period-subject-summary.repository';
import StudentGradeRepository from '../gradebooks/repositories/student-grade.repository';
import OrganizationRepository from '../organizations/organization.repository';
import StudentRepository from '../students/student.repository';
import ReportCardsController from './report-cards.controller';
import ReportCardsService from './report-cards.service';

@Module({
  imports: [GradingScalesModule, PermissionsModule],
  controllers: [ReportCardsController],
  providers: [
    OrganizationRepository,
    StudentRepository,
    EnrollmentRepository,
    AcademicPeriodRepository,
    ClassroomSubjectRepository,
    PeriodSubjectSummaryRepository,
    EvaluationItemRepository,
    StudentGradeRepository,
    ReportCardsService,
  ],
})
export default class ReportCardsModule {}
