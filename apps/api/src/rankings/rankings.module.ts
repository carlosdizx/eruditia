import { Module } from '@nestjs/common';
import GradingScalesModule from '../grading-scales/grading-scales.module';
import AcademicPeriodRepository from '../academic-years/repositories/academic-period.repository';
import AcademicYearRepository from '../academic-years/repositories/academic-year.repository';
import ClassroomRepository from '../classrooms/classroom.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../enrollments/enrollment.repository';
import PeriodSubjectSummaryRepository from '../gradebooks/repositories/period-subject-summary.repository';
import SubjectRecoveryRepository from '../gradebooks/repositories/subject-recovery.repository';
import RankingsController from './rankings.controller';
import RankingsService from './rankings.service';

@Module({
  imports: [GradingScalesModule],
  controllers: [RankingsController],
  providers: [
    AcademicYearRepository,
    AcademicPeriodRepository,
    ClassroomRepository,
    ClassroomSubjectRepository,
    EnrollmentRepository,
    PeriodSubjectSummaryRepository,
    SubjectRecoveryRepository,
    RankingsService,
  ],
  exports: [RankingsService],
})
export default class RankingsModule {}
