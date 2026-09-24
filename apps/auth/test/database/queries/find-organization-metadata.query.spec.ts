import findOrganizationMetadata from '@database/queries/find-organization-metadata.query';
import { DrizzleExecutor } from '@database/types/drizzle.types';
import { organization } from '@database/schema';

const createDb = (rows: { metadata: string | null }[]) => {
  const query = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
  const select = jest.fn().mockReturnValue(query);

  return { db: { select } as unknown as DrizzleExecutor, select, query };
};

describe('findOrganizationMetadata', () => {
  it('returns the raw metadata of the organization', async () => {
    const metadata = '{"features":["finance_module"]}';
    const { db, select, query } = createDb([{ metadata }]);

    await expect(findOrganizationMetadata(db, 'org-1')).resolves.toBe(metadata);
    expect(select).toHaveBeenCalledWith({ metadata: organization.metadata });
    expect(query.from).toHaveBeenCalledWith(organization);
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it('returns null when the organization has no metadata', async () => {
    const { db } = createDb([{ metadata: null }]);

    await expect(findOrganizationMetadata(db, 'org-1')).resolves.toBeNull();
  });

  it('returns null when the organization does not exist', async () => {
    const { db } = createDb([]);

    await expect(findOrganizationMetadata(db, 'org-1')).resolves.toBeNull();
  });
});
