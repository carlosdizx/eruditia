import AbstractRepository from '../database/repositories/abstract.repository';
import ExampleModel from '../database/models/example.model';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export default class ExampleRepository extends AbstractRepository<ExampleModel> {
  constructor() {
    super(ExampleModel, {
      logger: new Logger(ExampleRepository.name),
    });
  }
}
