import { Module } from '@nestjs/common';
import UsersModule from '../users/users.module';
import RolesModule from '../roles/roles.module';
import StudentsController from './students.controller';
import StudentsService from './students.service';
import StudentRepository from './student.repository';
import StudentAccessService from './student-access.service';

@Module({
  imports: [UsersModule, RolesModule],
  controllers: [StudentsController],
  providers: [StudentRepository, StudentAccessService, StudentsService],
  exports: [StudentsService],
})
export default class StudentsModule {}
