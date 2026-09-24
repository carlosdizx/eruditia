import { Injectable } from '@nestjs/common';
import { ExampleModel } from '../database/models/example.model';
import CrudService from '../database/services/crud.service';
import ExampleRepository from './example.repository';
import CreateExampleDto from './dto/create-example.dto';

@Injectable()
export default class ExamplesService extends CrudService<
  ExampleModel,
  ExampleRepository
> {
  constructor(repository: ExampleRepository) {
    super(repository);
  }

  public createExample = async (dto: CreateExampleDto) => {
    dto.title = dto.title.toUpperCase();
    await this.create({ ...dto });
  };
}
