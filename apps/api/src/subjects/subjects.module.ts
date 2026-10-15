import { Module } from '@nestjs/common';
import SubjectsController from './subjects.controller';
import SubjectsService from './subjects.service';
import SubjectRepository from './subject.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';

@Module({
  controllers: [SubjectsController],
  providers: [SubjectRepository, ClassroomSubjectRepository, SubjectsService],
  exports: [SubjectsService],
})
export default class SubjectsModule {}
