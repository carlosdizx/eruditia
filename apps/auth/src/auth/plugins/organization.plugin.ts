import { organization } from 'better-auth/plugins/organization';
import { DrizzleExecutor } from '@database/types/drizzle.types';
import { organizationRoles } from '@auth/access/organization-access';
import OrganizationRole from '@auth/enums/organization-role.enum';
import ensureSingleOrganizationHook from '@auth/hooks/ensure-single-organization.hook';
import rejectInvitationHook from '@auth/hooks/reject-invitation.hook';
import protectOrganizationMetadataHook from '@auth/hooks/protect-organization-metadata.hook';

const organizationPlugin = (db: DrizzleExecutor) =>
  organization({
    roles: organizationRoles,
    // Organizations are only created by the super admin, through
    // POST /system/organizations (a server-side "system action", which
    // Better Auth allows regardless of this flag).
    allowUserToCreateOrganization: false,
    creatorRole: OrganizationRole.ADMIN,
    disableOrganizationDeletion: true,
    organizationHooks: {
      beforeAddMember: ensureSingleOrganizationHook(db),
      beforeCreateInvitation: rejectInvitationHook,
      beforeUpdateOrganization: protectOrganizationMetadataHook,
    },
  });

export default organizationPlugin;
