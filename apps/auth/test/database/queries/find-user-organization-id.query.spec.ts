import findUserOrganizationId from '@database/queries/find-user-organization-id.query';
import { DrizzleExecutor } from '@database/types/drizzle.types';
import { member } from '@database/schema';

const createDb = (rows: { organizationId: string }[]) => {
  const query = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
  const select = jest.fn().mockReturnValue(query);

  return { db: { select } as unknown as DrizzleExecutor, select, query };
};

describe('findUserOrganizationId', () => {
  it('returns the organization the user is a member of', async () => {
    const { db, select, query } = createDb([{ organizationId: 'org-1' }]);

    await expect(findUserOrganizationId(db, 'user-1')).resolves.toBe('org-1');
    expect(select).toHaveBeenCalledWith({
      organizationId: member.organizationId,
    });
    expect(query.from).toHaveBeenCalledWith(member);
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it('returns null when the user has no membership', async () => {
    const { db } = createDb([]);

    await expect(findUserOrganizationId(db, 'user-1')).resolves.toBeNull();
  });
});
