import { organizationRoles } from '@auth/access/organization-access';
import OrganizationRole from '@auth/enums/organization-role.enum';

describe('organizationRoles', () => {
  it('defines exactly the admin, supervisor and member roles', () => {
    expect(Object.keys(organizationRoles).sort()).toEqual(
      [
        OrganizationRole.ADMIN,
        OrganizationRole.SUPERVISOR,
        OrganizationRole.MEMBER,
      ].sort(),
    );
  });

  it('lets an admin manage members and update the organization', () => {
    const result = organizationRoles[OrganizationRole.ADMIN].authorize({
      member: ['create', 'update', 'delete'],
      organization: ['update'],
    });

    expect(result.success).toBe(true);
  });

  it('does not let an admin delete the organization', () => {
    const result = organizationRoles[OrganizationRole.ADMIN].authorize({
      organization: ['delete'],
    });

    expect(result.success).toBe(false);
  });

  it.each([OrganizationRole.SUPERVISOR, OrganizationRole.MEMBER])(
    'does not let a %s manage members',
    (role) => {
      const result = organizationRoles[role].authorize({ member: ['create'] });

      expect(result.success).toBe(false);
    },
  );
});
