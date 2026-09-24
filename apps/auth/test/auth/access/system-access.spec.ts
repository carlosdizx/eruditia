import { systemRoles } from '@auth/access/system-access';
import SystemRole from '@auth/enums/system-role.enum';

describe('systemRoles', () => {
  it('defines exactly the super admin and user roles', () => {
    expect(Object.keys(systemRoles).sort()).toEqual(
      [SystemRole.SUPER_ADMIN, SystemRole.USER].sort(),
    );
  });

  it('lets the super admin manage users', () => {
    const result = systemRoles[SystemRole.SUPER_ADMIN].authorize({
      user: ['create', 'set-role', 'delete'],
    });

    expect(result.success).toBe(true);
  });

  it('gives a regular user no user-management permission', () => {
    const result = systemRoles[SystemRole.USER].authorize({
      user: ['create'],
    });

    expect(result.success).toBe(false);
  });
});
