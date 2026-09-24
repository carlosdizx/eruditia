import { adminAc, memberAc } from 'better-auth/plugins/organization/access';
import OrganizationRole from '@auth/enums/organization-role.enum';

// Permissions over Better Auth's own organization resources (members,
// invitations, ...). `supervisor` has no extra rights there; what sets it
// apart from `member` is which of this API's endpoints it can reach
// (see RolesGuard).
export const organizationRoles = {
  [OrganizationRole.ADMIN]: adminAc,
  [OrganizationRole.SUPERVISOR]: memberAc,
  [OrganizationRole.MEMBER]: memberAc,
};
