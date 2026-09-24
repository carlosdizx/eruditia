import { ForbiddenException } from '@nestjs/common';
import getActiveOrganizationId from '@auth/utils/get-active-organization-id.util';
import RequestSession from '@auth/types/request-session.type';

const sessionWith = (activeOrganizationId: string | null | undefined) =>
  ({
    user: { id: 'user-1' },
    session: { activeOrganizationId },
  }) as unknown as RequestSession;

describe('getActiveOrganizationId', () => {
  it('returns the active organization of the session', () => {
    expect(getActiveOrganizationId(sessionWith('org-1'))).toBe('org-1');
  });

  it.each([null, undefined, ''])(
    'throws 403 when there is no active organization (%p)',
    (activeOrganizationId) => {
      expect(() =>
        getActiveOrganizationId(sessionWith(activeOrganizationId)),
      ).toThrow(ForbiddenException);
    },
  );
});
