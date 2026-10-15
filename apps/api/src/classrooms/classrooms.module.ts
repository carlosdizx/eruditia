import { Module } from '@nestjs/common';
import AcademicYearsModule from '../academic-years/academic-years.module';
import GradeLevelsModule from '../grade-levels/grade-levels.module';
import UsersModule from '../users/users.module';
import ClassroomsController from './classrooms.controller';
import ClassroomsService from './classrooms.service';
import ClassroomRepository from './classroom.repository';

@Module({
  imports: [AcademicYearsModule, GradeLevelsModule, UsersModule],
  controllers: [ClassroomsController],
  providers: [ClassroomRepository, ClassroomsService],
  exports: [ClassroomsService],
})
export default class ClassroomsModule {}
