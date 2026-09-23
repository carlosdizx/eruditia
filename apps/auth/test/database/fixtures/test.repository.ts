import AbstractRepository from '@database/repositories/abstract.repository';
import RepositoryOptionsInterface from '@database/interfaces/repository-options.interface';
import { DrizzleDb } from '@database/types/drizzle.types';
import { testEntitiesTable } from './test-entity.schema';

export default class TestRepository extends AbstractRepository<
  typeof testEntitiesTable
> {
  constructor(
    db: DrizzleDb,
    options: RepositoryOptionsInterface = {},
  ) {
    super(db, testEntitiesTable, options);
  }
}
