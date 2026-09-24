import { APIError } from 'better-auth/api';
import { DrizzleExecutor } from '@database/types/drizzle.types';
import findUserOrganizationId from '@database/queries/find-user-organization-id.query';

export interface AddMemberData {
  member: { userId: string };
}

// Business rule: a user exists in a single organization; users are never
// shared. member.user_id is also unique in the database — this hook turns
// that into a clear 400 instead of a constraint violation.
const ensureSingleOrganizationHook =
  (db: DrizzleExecutor) =>
  async ({ member }: AddMemberData): Promise<void> => {
    const organizationId = await findUserOrganizationId(db, member.userId);

    if (organizationId) {
      throw new APIError('BAD_REQUEST', {
        message: 'User already belongs to an organization',
      });
    }
  };

export default ensureSingleOrganizationHook;
