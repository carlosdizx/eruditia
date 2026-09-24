import { APIError } from 'better-auth/api';

// Users are created by their organization's admins through
// POST /organizations/users, never through Better Auth's invitation flow
// (which would let an existing user of another organization join).
const rejectInvitationHook = async (): Promise<never> => {
  throw new APIError('FORBIDDEN', {
    message: 'Invitations are disabled; create users from the organization',
  });
};

export default rejectInvitationHook;
