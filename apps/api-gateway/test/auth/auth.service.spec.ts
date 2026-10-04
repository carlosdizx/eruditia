jest.mock('@common/utils/password.util', () => ({
  verifyPassword: jest.fn(),
}));

import 'reflect-metadata';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import UserStatusEnum from '@common/enums/user-status.enum';
import PermissionEnum from '@common/enums/permission.enum';
import RoleCategoryEnum from '@common/enums/role-category.enum';
import { verifyPassword } from '@common/utils/password.util';
import AuthService, { DUMMY_PASSWORD_HASH } from '@auth/auth.service';
import SessionsService from '@auth/sessions/sessions.service';
import UsersService from '../../src/users/users.service';
import PermissionsService from '../../src/permissions/services/permissions.service';
import authContextFixture from './fixtures/auth-context.fixture';

const mockedVerifyPassword = jest.mocked(verifyPassword);

describe('AuthService', () => {
  let usersService: {
    findOne: jest.Mock;
    findByPk: jest.Mock;
    updateByPk: jest.Mock;
  };
  let sessionsService: { createSession: jest.Mock; revokeSession: jest.Mock };
  let permissionsService: { getEffectivePermissions: jest.Mock };
  let service: AuthService;

  const dto = { email: 'ana@example.com', password: 'abcd-efgh-ijkl' };
  const metadata = { ipAddress: '203.0.113.7', userAgent: 'Mozilla/5.0' };
  const user = {
    id: 'user-id',
    organizationId: 'org-id',
    password: 'stored-hash',
    status: UserStatusEnum.ACTIVE,
    isActive: true,
    organization: { id: 'org-id', isActive: true },
  };
  const session = {
    id: 'session-id',
    expiresAt: new Date('2026-10-05T12:00:00Z'),
    lastActivityAt: new Date('2026-10-04T12:00:00Z'),
  };
  const auth = authContextFixture();

  beforeEach(() => {
    usersService = {
      findOne: jest.fn().mockResolvedValue(user),
      findByPk: jest.fn().mockResolvedValue({ id: 'user-id' }),
      updateByPk: jest.fn().mockResolvedValue(undefined),
    };
    sessionsService = {
      createSession: jest
        .fn()
        .mockResolvedValue({ token: 'plain-token', session }),
      revokeSession: jest.fn().mockResolvedValue(undefined),
    };
    permissionsService = {
      getEffectivePermissions: jest
        .fn()
        .mockResolvedValue([PermissionEnum.USER_LIST]),
    };
    mockedVerifyPassword.mockResolvedValue(true);

    service = new AuthService(
      usersService as unknown as UsersService,
      sessionsService as unknown as SessionsService,
      permissionsService as unknown as PermissionsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('verifies the password against the stored hash', async () => {
      await service.login(dto, metadata);

      expect(usersService.findOne).toHaveBeenCalledWith(
        { email: dto.email },
        false,
        expect.objectContaining({
          attributes: expect.arrayContaining(['password']) as unknown,
        }),
      );
      expect(mockedVerifyPassword).toHaveBeenCalledWith(
        dto.password,
        'stored-hash',
      );
    });

    it('returns a Bearer token and its expiration, never the password', async () => {
      const result = await service.login(dto, metadata);

      expect(result).toEqual({
        accessToken: 'plain-token',
        tokenType: 'Bearer',
        expiresAt: session.expiresAt,
      });
      expect(JSON.stringify(result)).not.toContain('stored-hash');
    });

    it('creates a session and records the login time', async () => {
      await service.login(dto, metadata);

      expect(sessionsService.createSession).toHaveBeenCalledWith(
        user,
        metadata,
      );
      expect(usersService.updateByPk).toHaveBeenCalledWith('user-id', {
        lastLoginAt: session.lastActivityAt,
      });
    });

    it('allows a pending user (first login with the temporary password)', async () => {
      usersService.findOne.mockResolvedValue({
        ...user,
        status: UserStatusEnum.PENDING,
      });

      await expect(service.login(dto, metadata)).resolves.toBeDefined();
    });

    describe('when the email is unknown', () => {
      beforeEach(() => {
        usersService.findOne.mockResolvedValue(null);
        mockedVerifyPassword.mockResolvedValue(false);
      });

      it('still verifies a password to equalize timing, then rejects', async () => {
        await expect(service.login(dto, metadata)).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
        expect(mockedVerifyPassword).toHaveBeenCalledWith(
          dto.password,
          DUMMY_PASSWORD_HASH,
        );
        expect(sessionsService.createSession).not.toHaveBeenCalled();
      });

      it('uses the same message as a wrong password', async () => {
        const unknownEmail = await service
          .login(dto, metadata)
          .catch((error: Error) => error.message);

        usersService.findOne.mockResolvedValue(user);
        const wrongPassword = await service
          .login(dto, metadata)
          .catch((error: Error) => error.message);

        expect(unknownEmail).toBe(wrongPassword);
      });
    });

    it('rejects a wrong password without creating a session', async () => {
      mockedVerifyPassword.mockResolvedValue(false);

      await expect(service.login(dto, metadata)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(sessionsService.createSession).not.toHaveBeenCalled();
      expect(usersService.updateByPk).not.toHaveBeenCalled();
    });

    it.each([
      ['suspended', { status: UserStatusEnum.SUSPENDED }],
      ['blocked', { status: UserStatusEnum.BLOCKED }],
      ['inactive', { isActive: false }],
      ['in an inactive organization', { organization: { isActive: false } }],
    ])('throws ForbiddenException for a user %s', async (_label, overrides) => {
      usersService.findOne.mockResolvedValue({ ...user, ...overrides });

      await expect(service.login(dto, metadata)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(sessionsService.createSession).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes the current session of the user', async () => {
      await expect(service.logout(auth)).resolves.toBeUndefined();

      expect(sessionsService.revokeSession).toHaveBeenCalledWith(
        'session-id',
        'user-id',
      );
    });
  });

  describe('me', () => {
    it('returns the user without the password and their effective permissions', async () => {
      await expect(service.me(auth)).resolves.toEqual({
        id: 'user-id',
        permissions: [PermissionEnum.USER_LIST],
      });
      expect(usersService.findByPk).toHaveBeenCalledWith(
        'user-id',
        true,
        expect.objectContaining({ attributes: { exclude: ['password'] } }),
      );
      expect(permissionsService.getEffectivePermissions).toHaveBeenCalledWith(
        'role-id',
        'org-id',
      );
    });

    it('returns the whole catalog for any core role', async () => {
      const result = await service.me(
        authContextFixture({
          roleName: 'HYPER_MEGA_ADMIN',
          roleCategory: RoleCategoryEnum.CORE,
          organizationId: null,
        }),
      );

      expect(result.permissions).toEqual(Object.values(PermissionEnum));
      expect(permissionsService.getEffectivePermissions).not.toHaveBeenCalled();
    });
  });
});

describe('DUMMY_PASSWORD_HASH', () => {
  const { verifyPassword: realVerifyPassword } = jest.requireActual<
    typeof import('@common/utils/password.util')
  >('@common/utils/password.util');

  it('is a well-formed hash that matches no real password', async () => {
    await expect(
      realVerifyPassword('abcd-efgh-ijkl', DUMMY_PASSWORD_HASH),
    ).resolves.toBe(false);
  });
});
