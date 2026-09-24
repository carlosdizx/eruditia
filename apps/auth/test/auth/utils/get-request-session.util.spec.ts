import { UnauthorizedException } from '@nestjs/common';
import getRequestSession from '@auth/utils/get-request-session.util';
import createExecutionContext from '../../fixtures/execution-context.fixture';

describe('getRequestSession', () => {
  it('returns the session stored on the request', () => {
    const session = { user: { id: 'user-1' }, session: { id: 'session-1' } };

    expect(getRequestSession(createExecutionContext({ session }))).toBe(
      session,
    );
  });

  it.each([null, undefined])('throws 401 when the session is %p', (session) => {
    expect(() =>
      getRequestSession(createExecutionContext({ session })),
    ).toThrow(UnauthorizedException);
  });
});
