import { Module } from '@nestjs/common';
import AcademicYearsController from './academic-years.controller';
import AcademicYearsService from './academic-years.service';
import AcademicYearRepository from './repositories/academic-year.repository';
import AcademicPeriodRepository from './repositories/academic-period.repository';
import ClassroomRepository from '../classrooms/classroom.repository';

@Module({
  controllers: [AcademicYearsController],
  providers: [
    AcademicYearRepository,
    AcademicPeriodRepository,
    ClassroomRepository,
    AcademicYearsService,
  ],
  exports: [AcademicYearsService],
})
export default class AcademicYearsModule {}
