import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import OrganizationModel from '@database/models/organization.model';
import OrganizationRepository from '../../src/organizations/organization.repository';

type RepositoryInternals = {
  model: unknown;
  logger: Logger;
  findByPkNotFoundMessage: string;
  findOneNotFoundMessage: string;
};

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;
  let internals: RepositoryInternals;

  beforeEach(() => {
    repository = new OrganizationRepository();
    internals = repository as unknown as RepositoryInternals;
  });

  it('extends AbstractRepository', () => {
    expect(repository).toBeInstanceOf(AbstractRepository);
  });

  it('works over OrganizationModel', () => {
    expect(internals.model).toBe(OrganizationModel);
  });

  it('uses a logger named after the repository', () => {
    expect(internals.logger).toBeInstanceOf(Logger);
    expect((internals.logger as unknown as { context: string }).context).toBe(
      OrganizationRepository.name,
    );
  });

  it('uses organization-specific not found messages', () => {
    expect(internals.findByPkNotFoundMessage).toBe(
      'Organización no encontrada',
    );
    expect(internals.findOneNotFoundMessage).toBe('Organización no encontrada');
  });
});
