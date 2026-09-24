import findMemberRole from '@database/queries/find-member-role.query';
import { DrizzleExecutor } from '@database/types/drizzle.types';
import { member } from '@database/schema';

const createDb = (rows: { role: string }[]) => {
  const query = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
  const select = jest.fn().mockReturnValue(query);

  return { db: { select } as unknown as DrizzleExecutor, select, query };
};

describe('findMemberRole', () => {
  it('returns the role of the user in the organization', async () => {
    const { db, select, query } = createDb([{ role: 'admin' }]);

    await expect(findMemberRole(db, 'user-1', 'org-1')).resolves.toBe('admin');
    expect(select).toHaveBeenCalledWith({ role: member.role });
    expect(query.from).toHaveBeenCalledWith(member);
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it('returns null when the user is not a member of it', async () => {
    const { db } = createDb([]);

    await expect(findMemberRole(db, 'user-1', 'org-1')).resolves.toBeNull();
  });
});
