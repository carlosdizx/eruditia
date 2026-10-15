import { Module } from '@nestjs/common';
import GradeLevelsController from './grade-levels.controller';
import GradeLevelsService from './grade-levels.service';
import GradeLevelRepository from './grade-level.repository';

@Module({
  controllers: [GradeLevelsController],
  providers: [GradeLevelRepository, GradeLevelsService],
  exports: [GradeLevelsService],
})
export default class GradeLevelsModule {}
