import { eq } from 'drizzle-orm';
import { DrizzleExecutor } from '@database/types/drizzle.types';
import { member } from '@database/schema';

// A user belongs to at most one organization (member.user_id is unique).
const findUserOrganizationId = async (
  db: DrizzleExecutor,
  userId: string,
): Promise<string | null> => {
  const [membership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .limit(1);

  return membership?.organizationId ?? null;
};

export default findUserOrganizationId;
