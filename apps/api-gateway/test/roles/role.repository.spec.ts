import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import RoleModel from '@database/models/role.model';
import RoleRepository from '../../src/roles/role.repository';

type RepositoryInternals = {
  model: unknown;
  logger: Logger;
  findByPkNotFoundMessage: string;
  findOneNotFoundMessage: string;
};

describe('RoleRepository', () => {
  let repository: RoleRepository;
  let internals: RepositoryInternals;

  beforeEach(() => {
    repository = new RoleRepository();
    internals = repository as unknown as RepositoryInternals;
  });

  it('extends AbstractRepository', () => {
    expect(repository).toBeInstanceOf(AbstractRepository);
  });

  it('works over RoleModel', () => {
    expect(internals.model).toBe(RoleModel);
  });

  it('uses a logger named after the repository', () => {
    expect(internals.logger).toBeInstanceOf(Logger);
    expect((internals.logger as unknown as { context: string }).context).toBe(
      RoleRepository.name,
    );
  });

  it('uses role-specific not found messages', () => {
    expect(internals.findByPkNotFoundMessage).toBe('Rol no encontrado');
    expect(internals.findOneNotFoundMessage).toBe('Rol no encontrado');
  });
});
