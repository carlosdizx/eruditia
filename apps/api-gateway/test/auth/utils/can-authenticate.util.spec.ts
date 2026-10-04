import UserStatusEnum from '@common/enums/user-status.enum';
import canAuthenticate from '@auth/utils/can-authenticate.util';

describe('canAuthenticate', () => {
  const user = { status: UserStatusEnum.ACTIVE, isActive: true };

  it.each([UserStatusEnum.PENDING, UserStatusEnum.ACTIVE])(
    'allows a user with status "%s"',
    (status) => {
      expect(canAuthenticate({ ...user, status })).toBe(true);
    },
  );

  it.each([UserStatusEnum.SUSPENDED, UserStatusEnum.BLOCKED])(
    'rejects a user with status "%s"',
    (status) => {
      expect(canAuthenticate({ ...user, status })).toBe(false);
    },
  );

  it('rejects an inactive user', () => {
    expect(canAuthenticate({ ...user, isActive: false })).toBe(false);
  });

  it('allows a user without organization (e.g. super admin)', () => {
    expect(canAuthenticate({ ...user, organization: null })).toBe(true);
    expect(canAuthenticate(user)).toBe(true);
  });

  it('rejects a user whose organization is inactive', () => {
    expect(
      canAuthenticate({ ...user, organization: { isActive: false } }),
    ).toBe(false);
  });
});
