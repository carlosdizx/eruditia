import { Module } from '@nestjs/common';
import AcademicYearsModule from '../academic-years/academic-years.module';
import ClassroomsModule from '../classrooms/classrooms.module';
import SubjectsModule from '../subjects/subjects.module';
import UsersModule from '../users/users.module';
import ClassroomSubjectsController from './classroom-subjects.controller';
import ClassroomSubjectsService from './classroom-subjects.service';
import ClassroomSubjectRepository from './classroom-subject.repository';

@Module({
  imports: [AcademicYearsModule, ClassroomsModule, SubjectsModule, UsersModule],
  controllers: [ClassroomSubjectsController],
  providers: [ClassroomSubjectRepository, ClassroomSubjectsService],
})
export default class ClassroomSubjectsModule {}
