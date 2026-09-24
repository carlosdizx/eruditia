import { InternalServerErrorException } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { Auth } from '@common/config/auth.config';
import Feature from '@auth/enums/feature.enum';
import SystemOrganizationsService from '@services/system-organizations.service';
import UserAccountsService from '@services/user-accounts.service';

describe('SystemOrganizationsService', () => {
  const createOrganization = jest.fn();
  const authService = {
    api: { createOrganization },
  } as unknown as AuthService<Auth>;
  const userAccountsService = {
    create: jest.fn(),
    remove: jest.fn(),
  };
  const service = new SystemOrganizationsService(
    authService,
    userAccountsService as unknown as UserAccountsService,
  );

  const admin = { id: 'user-1', name: 'Ada', email: 'ada@acme.com' };
  const createdAt = new Date('2026-09-23T12:00:00.000Z');
  const dto = {
    name: 'Acme',
    slug: 'acme',
    features: [Feature.FINANCE_MODULE, Feature.API_EXTERNAL],
    admin: { name: 'Ada', email: 'ada@acme.com', password: 'secret123' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userAccountsService.create.mockResolvedValue(admin);
    createOrganization.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      metadata: { features: ['finance_module', 'api:external'] },
      createdAt,
      members: [],
    });
  });

  it('creates the admin account first', async () => {
    await service.create(dto);

    expect(userAccountsService.create).toHaveBeenCalledWith(dto.admin);
  });

  it('creates the organization for the admin, with its features', async () => {
    await service.create(dto);

    expect(createOrganization).toHaveBeenCalledWith({
      body: {
        name: 'Acme',
        slug: 'acme',
        metadata: { features: ['finance_module', 'api:external'] },
        userId: 'user-1',
      },
    });
  });

  it('returns the organization with its features and admin', async () => {
    await expect(service.create(dto)).resolves.toEqual({
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      features: ['finance_module', 'api:external'],
      createdAt,
      admin,
    });
    expect(userAccountsService.remove).not.toHaveBeenCalled();
  });

  it('removes the admin account when the organization fails', async () => {
    const error = new Error('Organization already exists');
    createOrganization.mockRejectedValue(error);

    await expect(service.create(dto)).rejects.toBe(error);
    expect(userAccountsService.remove).toHaveBeenCalledWith('user-1');
  });

  it('removes the admin account when no organization comes back', async () => {
    createOrganization.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(userAccountsService.remove).toHaveBeenCalledWith('user-1');
  });

  it('does not create the organization when the admin account fails', async () => {
    const error = new Error('User already exists');
    userAccountsService.create.mockRejectedValue(error);

    await expect(service.create(dto)).rejects.toBe(error);
    expect(createOrganization).not.toHaveBeenCalled();
    expect(userAccountsService.remove).not.toHaveBeenCalled();
  });
});
