import { Module } from '@nestjs/common';
import GradeLevelsController from './grade-levels.controller';
import GradeLevelsService from './grade-levels.service';
import GradeLevelRepository from './grade-level.repository';
import ClassroomRepository from '../classrooms/classroom.repository';

@Module({
  controllers: [GradeLevelsController],
  providers: [GradeLevelRepository, ClassroomRepository, GradeLevelsService],
  exports: [GradeLevelsService],
})
export default class GradeLevelsModule {}
