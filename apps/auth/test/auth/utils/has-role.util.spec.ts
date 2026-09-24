import hasRole from '@auth/utils/has-role.util';

describe('hasRole', () => {
  it('matches a single role', () => {
    expect(hasRole('admin', ['admin', 'supervisor'])).toBe(true);
  });

  it('matches any of several comma-separated roles', () => {
    expect(hasRole('member, supervisor', ['supervisor'])).toBe(true);
  });

  it('matches a role array', () => {
    expect(hasRole(['member', 'admin'], ['admin'])).toBe(true);
  });

  it('rejects a role that is not allowed', () => {
    expect(hasRole('member', ['admin', 'supervisor'])).toBe(false);
  });

  it.each([null, undefined, ''])('rejects a missing role (%p)', (role) => {
    expect(hasRole(role, ['admin'])).toBe(false);
  });

  it('does not match on a partial role name', () => {
    expect(hasRole('superadmin', ['admin'])).toBe(false);
  });
});
