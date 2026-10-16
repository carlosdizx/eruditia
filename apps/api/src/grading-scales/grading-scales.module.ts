import { Module } from '@nestjs/common';
import GradingScalesController from './grading-scales.controller';
import GradingScalesService from './grading-scales.service';
import GradingScaleRepository from './grading-scale.repository';

@Module({
  controllers: [GradingScalesController],
  providers: [GradingScaleRepository, GradingScalesService],
  exports: [GradingScalesService],
})
export default class GradingScalesModule {}
