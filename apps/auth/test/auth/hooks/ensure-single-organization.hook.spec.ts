import { APIError } from 'better-auth/api';
import ensureSingleOrganizationHook from '@auth/hooks/ensure-single-organization.hook';
import findUserOrganizationId from '@database/queries/find-user-organization-id.query';
import { DrizzleExecutor } from '@database/types/drizzle.types';

jest.mock('@database/queries/find-user-organization-id.query', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const db = {} as DrizzleExecutor;
const data = { member: { userId: 'user-1' } };

describe('ensureSingleOrganizationHook', () => {
  it('lets a user without an organization be added', async () => {
    jest.mocked(findUserOrganizationId).mockResolvedValue(null);

    await expect(ensureSingleOrganizationHook(db)(data)).resolves.toBe(
      undefined,
    );
    expect(findUserOrganizationId).toHaveBeenCalledWith(db, 'user-1');
  });

  it('rejects a user who already belongs to an organization', async () => {
    jest.mocked(findUserOrganizationId).mockResolvedValue('org-1');

    const promise = ensureSingleOrganizationHook(db)(data);

    await expect(promise).rejects.toBeInstanceOf(APIError);
    await expect(promise).rejects.toMatchObject({
      status: 'BAD_REQUEST',
      message: 'User already belongs to an organization',
    });
  });
});
