import { ModelCtor } from 'sequelize-typescript';
import TestEntityModel from './test-entity.model';
import AbstractRepository from '@database/repositories/abstract.repository';
import RepositoryOptionsInterface from '@database/interfaces/repository-options.interface';

export default class TestRepository extends AbstractRepository<TestEntityModel> {
  constructor(
    model: ModelCtor<TestEntityModel>,
    options: RepositoryOptionsInterface<TestEntityModel> = {},
  ) {
    super(model, options);
  }
}
