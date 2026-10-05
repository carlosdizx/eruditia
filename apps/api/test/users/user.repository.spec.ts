import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import UserModel from '@database/models/user.model';
import UserRepository from '../../src/users/user.repository';

type RepositoryInternals = {
  model: unknown;
  logger: Logger;
  findByPkNotFoundMessage: string;
  findOneNotFoundMessage: string;
};

describe('UserRepository', () => {
  let repository: UserRepository;
  let internals: RepositoryInternals;

  beforeEach(() => {
    repository = new UserRepository();
    internals = repository as unknown as RepositoryInternals;
  });

  it('extends AbstractRepository', () => {
    expect(repository).toBeInstanceOf(AbstractRepository);
  });

  it('works over UserModel', () => {
    expect(internals.model).toBe(UserModel);
  });

  it('uses a logger named after the repository', () => {
    expect(internals.logger).toBeInstanceOf(Logger);
    expect((internals.logger as unknown as { context: string }).context).toBe(
      UserRepository.name,
    );
  });

  it('uses user-specific not found messages', () => {
    expect(internals.findByPkNotFoundMessage).toBe('Usuario no encontrado');
    expect(internals.findOneNotFoundMessage).toBe('Usuario no encontrado');
  });
});
