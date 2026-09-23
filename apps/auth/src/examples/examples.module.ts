import { Module } from '@nestjs/common';
import ExamplesService from './examples.service';
import ExamplesController from './examples.controller';
import ExampleRepository from './example.repository';

@Module({
  controllers: [ExamplesController],
  providers: [ExampleRepository, ExamplesService],
})
export default class ExamplesModule {}
