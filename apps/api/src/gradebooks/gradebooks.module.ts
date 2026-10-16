import { Module } from '@nestjs/common';
import GradingScalesModule from '../grading-scales/grading-scales.module';
import AcademicPeriodRepository from '../academic-years/repositories/academic-period.repository';
import AcademicYearRepository from '../academic-years/repositories/academic-year.repository';
import ClassroomRepository from '../classrooms/classroom.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../enrollments/enrollment.repository';
import GradebooksController from './gradebooks.controller';
import GradebooksService from './gradebooks.service';
import AnnualResultsService from './annual-results.service';
import RecoveriesController from './recoveries.controller';
import RecoveriesService from './recoveries.service';
import EvaluationItemRepository from './repositories/evaluation-item.repository';
import StudentGradeRepository from './repositories/student-grade.repository';
import PeriodSubjectSummaryRepository from './repositories/period-subject-summary.repository';
import SubjectRecoveryRepository from './repositories/subject-recovery.repository';

@Module({
  imports: [GradingScalesModule],
  controllers: [GradebooksController, RecoveriesController],
  providers: [
    AcademicPeriodRepository,
    AcademicYearRepository,
    ClassroomRepository,
    ClassroomSubjectRepository,
    EnrollmentRepository,
    EvaluationItemRepository,
    StudentGradeRepository,
    PeriodSubjectSummaryRepository,
    SubjectRecoveryRepository,
    GradebooksService,
    AnnualResultsService,
    RecoveriesService,
  ],
  exports: [AnnualResultsService],
})
export default class GradebooksModule {}
