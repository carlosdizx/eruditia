import { DrizzleExecutor } from '@database/types/drizzle.types';
import findUserOrganizationId from '@database/queries/find-user-organization-id.query';

export interface NewSession {
  userId: string;
  activeOrganizationId?: string | null;
  [key: string]: unknown;
}

// Every user belongs to exactly one organization, so each new session
// starts with it already active — guards read `activeOrganizationId` without
// the client having to call `organization/set-active` first.
const assignActiveOrganizationHook =
  (db: DrizzleExecutor) => async (session: NewSession) => {
    const activeOrganizationId = await findUserOrganizationId(
      db,
      session.userId,
    );

    return { data: { ...session, activeOrganizationId } };
  };

export default assignActiveOrganizationHook;
