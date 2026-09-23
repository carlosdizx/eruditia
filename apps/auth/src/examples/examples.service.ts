import { Injectable } from '@nestjs/common';
import { examplesTable } from '@database/schema/example.schema';
import ExampleRepository from './example.repository';
import CreateExampleDto from './dto/create-example.dto';
import CrudService from '@database/services/crud.service';

@Injectable()
export default class ExamplesService extends CrudService<
  typeof examplesTable,
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
