import { ForbiddenException } from '@nestjs/common';
import RequestSession from '@auth/types/request-session.type';

// Organization-scoped checks need an organization to scope to. Sessions get
// it on sign-in (see assignActiveOrganizationHook); a user without one (e.g.
// the super admin) cannot use organization endpoints.
const getActiveOrganizationId = ({ session }: RequestSession): string => {
  if (!session.activeOrganizationId) {
    throw new ForbiddenException('No active organization in the session');
  }

  return session.activeOrganizationId;
};

export default getActiveOrganizationId;
