import { organization } from 'better-auth/plugins/organization';
import organizationPlugin from '@auth/plugins/organization.plugin';
import { organizationRoles } from '@auth/access/organization-access';
import ensureSingleOrganizationHook from '@auth/hooks/ensure-single-organization.hook';
import rejectInvitationHook from '@auth/hooks/reject-invitation.hook';
import protectOrganizationMetadataHook from '@auth/hooks/protect-organization-metadata.hook';
import { DrizzleExecutor } from '@database/types/drizzle.types';

jest.mock('better-auth/plugins/organization', () => ({
  organization: jest.fn(),
}));
jest.mock('@auth/hooks/ensure-single-organization.hook', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('organizationPlugin', () => {
  const db = {} as DrizzleExecutor;
  const beforeAddMember = jest.fn();
  const plugin = { id: 'organization' };

  beforeEach(() => {
    jest.mocked(ensureSingleOrganizationHook).mockReturnValue(beforeAddMember);
    jest.mocked(organization).mockReturnValue(plugin as never);
  });

  it('returns the configured organization plugin', () => {
    expect(organizationPlugin(db)).toBe(plugin);
  });

  it('uses the admin, supervisor and member roles, with admin as creator', () => {
    organizationPlugin(db);

    expect(organization).toHaveBeenCalledWith(
      expect.objectContaining({
        roles: organizationRoles,
        creatorRole: 'admin',
      }),
    );
  });

  it('does not let users create or delete organizations themselves', () => {
    organizationPlugin(db);

    expect(organization).toHaveBeenCalledWith(
      expect.objectContaining({
        allowUserToCreateOrganization: false,
        disableOrganizationDeletion: true,
      }),
    );
  });

  it('enforces one organization per user, disables invitations and protects the features', () => {
    organizationPlugin(db);

    expect(ensureSingleOrganizationHook).toHaveBeenCalledWith(db);
    expect(organization).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationHooks: {
          beforeAddMember,
          beforeCreateInvitation: rejectInvitationHook,
          beforeUpdateOrganization: protectOrganizationMetadataHook,
        },
      }),
    );
  });
});
