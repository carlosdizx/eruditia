import { admin } from 'better-auth/plugins/admin';
import adminPlugin from '@auth/plugins/admin.plugin';
import { systemRoles } from '@auth/access/system-access';

jest.mock('better-auth/plugins/admin', () => ({ admin: jest.fn() }));

describe('adminPlugin', () => {
  it('makes only the super admin a system administrator', () => {
    const plugin = { id: 'admin' };
    jest.mocked(admin).mockReturnValue(plugin as never);

    expect(adminPlugin()).toBe(plugin);
    expect(admin).toHaveBeenCalledWith({
      roles: systemRoles,
      adminRoles: ['superadmin'],
      defaultRole: 'user',
    });
  });
});
