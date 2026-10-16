import { Module } from '@nestjs/common';
import GradingScalesModule from '../grading-scales/grading-scales.module';
import AcademicPeriodRepository from '../academic-years/repositories/academic-period.repository';
import ClassroomRepository from '../classrooms/classroom.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../enrollments/enrollment.repository';
import GradebooksController from './gradebooks.controller';
import GradebooksService from './gradebooks.service';
import EvaluationItemRepository from './repositories/evaluation-item.repository';
import StudentGradeRepository from './repositories/student-grade.repository';
import PeriodSubjectSummaryRepository from './repositories/period-subject-summary.repository';

@Module({
  imports: [GradingScalesModule],
  controllers: [GradebooksController],
  providers: [
    AcademicPeriodRepository,
    ClassroomRepository,
    ClassroomSubjectRepository,
    EnrollmentRepository,
    EvaluationItemRepository,
    StudentGradeRepository,
    PeriodSubjectSummaryRepository,
    GradebooksService,
  ],
})
export default class GradebooksModule {}
