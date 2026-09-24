import { and, eq } from 'drizzle-orm';
import { DrizzleExecutor } from '@database/types/drizzle.types';
import { member } from '@database/schema';

const findMemberRole = async (
  db: DrizzleExecutor,
  userId: string,
  organizationId: string,
): Promise<string | null> => {
  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId)),
    )
    .limit(1);

  return membership?.role ?? null;
};

export default findMemberRole;
