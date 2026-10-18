import 'reflect-metadata';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import AuthGuard from '@auth/guards/auth.guard';
import SessionsService from '@auth/sessions/sessions.service';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import AuthenticatedRequestInterface from '@auth/interfaces/authenticated-request.interface';
import authContextFixture from '../fixtures/auth-context.fixture';

const handler = () => {};
class TestController {}

const contextFor = (request: Partial<AuthenticatedRequestInterface>) =>
  ({
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  const auth = authContextFixture();
  let reflector: { getAllAndOverride: jest.Mock };
  let sessionsService: { validateSession: jest.Mock };
  let guard: AuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    sessionsService = { validateSession: jest.fn().mockResolvedValue(auth) };
    guard = new AuthGuard(
      reflector as unknown as Reflector,
      sessionsService as unknown as SessionsService,
    );
  });

  it('reads the public flag from the handler and the controller', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await guard.canActivate(contextFor({ headers: {} }));

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      handler,
      TestController,
    ]);
  });

  it('lets public endpoints through without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(
      true,
    );
    expect(sessionsService.validateSession).not.toHaveBeenCalled();
  });

  it('rejects a private endpoint without Authorization header', async () => {
    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessionsService.validateSession).not.toHaveBeenCalled();
  });

  it('rejects a non-Bearer Authorization header', async () => {
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Basic dXNlcjpwYXNz' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validates the token and attaches the auth context to the request', async () => {
    const request: Partial<AuthenticatedRequestInterface> = {
      headers: { authorization: 'Bearer token' },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(sessionsService.validateSession).toHaveBeenCalledWith('token');
    expect(request.auth).toBe(auth);
  });

  it('propagates the rejection of an invalid session', async () => {
    const error = new UnauthorizedException();
    sessionsService.validateSession.mockRejectedValue(error);
    const request: Partial<AuthenticatedRequestInterface> = {
      headers: { authorization: 'Bearer token' },
    };

    await expect(guard.canActivate(contextFor(request))).rejects.toBe(error);
    expect(request.auth).toBeUndefined();
  });
});
