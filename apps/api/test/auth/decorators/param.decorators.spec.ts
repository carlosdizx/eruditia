import 'reflect-metadata';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { getCurrentAuth } from '@auth/decorators/current-auth.decorator';
import { getRequestMetadata } from '@auth/decorators/request-metadata.decorator';
import authContextFixture from '../fixtures/auth-context.fixture';

const contextWith = (request: object) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('getCurrentAuth', () => {
  it('returns the auth context attached by the AuthGuard', () => {
    const auth = authContextFixture();

    expect(getCurrentAuth(undefined, contextWith({ auth }))).toBe(auth);
  });

  it('throws UnauthorizedException when there is no auth context', () => {
    expect(() => getCurrentAuth(undefined, contextWith({}))).toThrow(
      UnauthorizedException,
    );
  });
});

describe('getRequestMetadata', () => {
  it('returns the ip and user agent of the request', () => {
    const request = {
      ip: '203.0.113.7',
      headers: { 'user-agent': 'Mozilla/5.0' },
    };

    expect(getRequestMetadata(undefined, contextWith(request))).toEqual({
      ipAddress: '203.0.113.7',
      userAgent: 'Mozilla/5.0',
    });
  });

  it('returns nulls when the data is missing', () => {
    expect(getRequestMetadata(undefined, contextWith({ headers: {} }))).toEqual(
      { ipAddress: null, userAgent: null },
    );
  });

  it('truncates very long user agents', () => {
    const request = { ip: '::1', headers: { 'user-agent': 'a'.repeat(5000) } };

    expect(
      getRequestMetadata(undefined, contextWith(request)).userAgent,
    ).toHaveLength(512);
  });
});
