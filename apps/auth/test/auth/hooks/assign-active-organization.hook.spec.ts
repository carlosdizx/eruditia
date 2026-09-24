import assignActiveOrganizationHook from '@auth/hooks/assign-active-organization.hook';
import findUserOrganizationId from '@database/queries/find-user-organization-id.query';
import { DrizzleExecutor } from '@database/types/drizzle.types';

jest.mock('@database/queries/find-user-organization-id.query', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const db = {} as DrizzleExecutor;
const session = { userId: 'user-1', token: 'token' };

describe('assignActiveOrganizationHook', () => {
  it('activates the organization of the user on the new session', async () => {
    jest.mocked(findUserOrganizationId).mockResolvedValue('org-1');

    await expect(assignActiveOrganizationHook(db)(session)).resolves.toEqual({
      data: { ...session, activeOrganizationId: 'org-1' },
    });
    expect(findUserOrganizationId).toHaveBeenCalledWith(db, 'user-1');
  });

  it('leaves no active organization for a user without one', async () => {
    jest.mocked(findUserOrganizationId).mockResolvedValue(null);

    await expect(assignActiveOrganizationHook(db)(session)).resolves.toEqual({
      data: { ...session, activeOrganizationId: null },
    });
  });
});
