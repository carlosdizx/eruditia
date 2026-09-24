import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import SuperAdminGuard from '@auth/guards/super-admin.guard';
import createExecutionContext from '../../fixtures/execution-context.fixture';

const contextFor = (role: string | null) =>
  createExecutionContext({
    session: { user: { id: 'user-1', role }, session: {} },
  });

describe('SuperAdminGuard', () => {
  const guard = new SuperAdminGuard();

  it('lets the super admin through', () => {
    expect(guard.canActivate(contextFor('superadmin'))).toBe(true);
  });

  it('lets a user whose roles include super admin through', () => {
    expect(guard.canActivate(contextFor('user,superadmin'))).toBe(true);
  });

  it.each(['user', null])('rejects a user with role %p with 403', (role) => {
    expect(() => guard.canActivate(contextFor(role))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects an organization admin with 403', () => {
    // `admin` is an organization role, not a system one.
    expect(() => guard.canActivate(contextFor('admin'))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a request without session with 401', () => {
    expect(() =>
      guard.canActivate(createExecutionContext({ session: null })),
    ).toThrow(UnauthorizedException);
  });
});
