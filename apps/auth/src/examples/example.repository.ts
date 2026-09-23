import { Inject, Injectable, Logger } from '@nestjs/common';
import AbstractRepository from '../database/repositories/abstract.repository';
import { examplesTable } from '../database/schema/example.schema';
import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/types/drizzle.types';

@Injectable()
export default class ExampleRepository extends AbstractRepository<
  typeof examplesTable
> {
  constructor(@Inject(DRIZZLE) db: DrizzleDb) {
    super(db, examplesTable, {
      logger: new Logger(ExampleRepository.name),
    });
  }
}
