import { AuthService } from '@thallesp/nestjs-better-auth';
import { Auth } from '@common/config/auth.config';
import OrganizationRole from '@auth/enums/organization-role.enum';
import OrganizationUsersService from '@services/organization-users.service';
import UserAccountsService from '@services/user-accounts.service';

describe('OrganizationUsersService', () => {
  const addMember = jest.fn();
  const authService = { api: { addMember } } as unknown as AuthService<Auth>;
  const userAccountsService = { create: jest.fn(), remove: jest.fn() };
  const service = new OrganizationUsersService(
    authService,
    userAccountsService as unknown as UserAccountsService,
  );

  const user = { id: 'user-2', name: 'Grace', email: 'grace@acme.com' };
  const dto = {
    name: 'Grace',
    email: 'grace@acme.com',
    password: 'secret123',
    role: OrganizationRole.SUPERVISOR,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userAccountsService.create.mockResolvedValue(user);
    addMember.mockResolvedValue({ id: 'member-1' });
  });

  it('creates the user account', async () => {
    await service.create('org-1', dto);

    expect(userAccountsService.create).toHaveBeenCalledWith(dto);
  });

  it('adds the user to the organization with the requested role', async () => {
    await service.create('org-1', dto);

    expect(addMember).toHaveBeenCalledWith({
      body: { userId: 'user-2', organizationId: 'org-1', role: 'supervisor' },
    });
  });

  it('returns the user with its organization and role', async () => {
    await expect(service.create('org-1', dto)).resolves.toEqual({
      ...user,
      organizationId: 'org-1',
      role: 'supervisor',
    });
    expect(userAccountsService.remove).not.toHaveBeenCalled();
  });

  it('removes the account when the membership fails', async () => {
    const error = new Error('User already belongs to an organization');
    addMember.mockRejectedValue(error);

    await expect(service.create('org-1', dto)).rejects.toBe(error);
    expect(userAccountsService.remove).toHaveBeenCalledWith('user-2');
  });

  it('does not add a membership when the account fails', async () => {
    const error = new Error('User already exists');
    userAccountsService.create.mockRejectedValue(error);

    await expect(service.create('org-1', dto)).rejects.toBe(error);
    expect(addMember).not.toHaveBeenCalled();
  });
});
