import 'reflect-metadata';
import AuthController from '@auth/auth.controller';
import AuthService from '@auth/auth.service';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import authContextFixture from './fixtures/auth-context.fixture';

const isPublic = (handler: string) =>
  Reflect.getMetadata(
    IS_PUBLIC_KEY,
    Object.getOwnPropertyDescriptor(AuthController.prototype, handler)!
      .value as object,
  ) as boolean | undefined;

describe('AuthController', () => {
  let authService: {
    login: jest.Mock;
    verifyTwoFactor: jest.Mock;
    logout: jest.Mock;
    me: jest.Mock;
  };
  let controller: AuthController;
  const auth = authContextFixture();

  beforeEach(() => {
    authService = {
      login: jest.fn().mockResolvedValue({ accessToken: 'token' }),
      verifyTwoFactor: jest.fn().mockResolvedValue({ accessToken: 'token' }),
      logout: jest.fn().mockResolvedValue(undefined),
      me: jest.fn().mockResolvedValue({ id: 'user-id' }),
    };
    controller = new AuthController(authService as unknown as AuthService);
  });

  it('only exposes login and two-factor verification publicly', () => {
    expect(isPublic('login')).toBe(true);
    expect(isPublic('verifyTwoFactor')).toBe(true);
    expect(isPublic('logout')).toBeUndefined();
    expect(isPublic('me')).toBeUndefined();
  });

  it('delegates login', async () => {
    const dto = { email: 'ana@example.com', password: 'secret' };
    const metadata = { ipAddress: '::1', userAgent: null };

    await expect(controller.login(dto, metadata)).resolves.toEqual({
      accessToken: 'token',
    });
    expect(authService.login).toHaveBeenCalledWith(dto, metadata);
  });

  it('delegates two-factor verification', async () => {
    const dto = {
      challengeId: '0199b6a4-0000-7000-8000-000000000001',
      code: '123456',
    };
    const metadata = { ipAddress: '::1', userAgent: null };

    await expect(controller.verifyTwoFactor(dto, metadata)).resolves.toEqual({
      accessToken: 'token',
    });
    expect(authService.verifyTwoFactor).toHaveBeenCalledWith(dto, metadata);
  });

  it('delegates logout', async () => {
    await expect(controller.logout(auth)).resolves.toBeUndefined();
    expect(authService.logout).toHaveBeenCalledWith(auth);
  });

  it('delegates me', async () => {
    await expect(controller.me(auth)).resolves.toEqual({ id: 'user-id' });
    expect(authService.me).toHaveBeenCalledWith(auth);
  });
});
