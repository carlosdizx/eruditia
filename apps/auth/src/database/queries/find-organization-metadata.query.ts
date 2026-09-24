import { eq } from 'drizzle-orm';
import { DrizzleExecutor } from '@database/types/drizzle.types';
import { organization } from '@database/schema';

// Raw `organization.metadata` (a JSON string), or null when the organization
// has none or does not exist.
const findOrganizationMetadata = async (
  db: DrizzleExecutor,
  organizationId: string,
): Promise<string | null> => {
  const [found] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  return found?.metadata ?? null;
};

export default findOrganizationMetadata;
