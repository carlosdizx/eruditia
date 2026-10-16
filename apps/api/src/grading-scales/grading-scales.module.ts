import { Module } from '@nestjs/common';
import GradingScalesController from './grading-scales.controller';
import GradingScalesService from './grading-scales.service';
import GradingScaleRepository from './grading-scale.repository';
import StudentGradeRepository from '../gradebooks/repositories/student-grade.repository';
import PeriodSubjectSummaryRepository from '../gradebooks/repositories/period-subject-summary.repository';

@Module({
  controllers: [GradingScalesController],
  providers: [
    GradingScaleRepository,
    StudentGradeRepository,
    PeriodSubjectSummaryRepository,
    GradingScalesService,
  ],
  exports: [GradingScalesService],
})
export default class GradingScalesModule {}
