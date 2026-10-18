import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import UserPasskeyModel from '@database/models/user-passkey.model';
import UserPasskeyRepository from '../../../src/two-factor/repositories/user-passkey.repository';

type RepositoryInternals = {
  model: unknown;
  logger: Logger;
  findByPkNotFoundMessage: string;
  findOneNotFoundMessage: string;
};

describe('UserPasskeyRepository', () => {
  let repository: UserPasskeyRepository;
  let internals: RepositoryInternals;

  beforeEach(() => {
    repository = new UserPasskeyRepository();
    internals = repository as unknown as RepositoryInternals;
  });

  it('extends AbstractRepository over UserPasskeyModel', () => {
    expect(repository).toBeInstanceOf(AbstractRepository);
    expect(internals.model).toBe(UserPasskeyModel);
  });

  it('uses a logger named after the repository', () => {
    expect(internals.logger).toBeInstanceOf(Logger);
    expect((internals.logger as unknown as { context: string }).context).toBe(
      UserPasskeyRepository.name,
    );
  });

  it('uses passkey-specific not found messages', () => {
    expect(internals.findByPkNotFoundMessage).toBe('Passkey no encontrada');
    expect(internals.findOneNotFoundMessage).toBe('Passkey no encontrada');
  });
});
