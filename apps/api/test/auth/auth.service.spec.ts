jest.mock('@common/utils/password.util', () => ({
  verifyPassword: jest.fn(),
}));

import 'reflect-metadata';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import UserStatusEnum from '@common/enums/user-status.enum';
import PermissionEnum from '@common/enums/permission.enum';
import RoleCategoryEnum from '@common/enums/role-category.enum';
import TwoFactorMethodEnum from '@common/enums/two-factor-method.enum';
import { verifyPassword } from '@common/utils/password.util';
import AuthService, { DUMMY_PASSWORD_HASH } from '@auth/auth.service';
import SessionsService from '@auth/sessions/sessions.service';
import {
  ACCOUNT_DISABLED_MESSAGE,
  TWO_FACTOR_UNAVAILABLE_MESSAGE,
} from '@auth/constants/auth-messages.constant';
import UsersService from '../../src/users/users.service';
import PermissionsService from '../../src/permissions/services/permissions.service';
import UserTwoFactorMethodsService from '../../src/two-factor/services/user-two-factor-methods.service';
import UserTwoFactorCodesService from '../../src/two-factor/services/user-two-factor-codes.service';
import authContextFixture from './fixtures/auth-context.fixture';

const mockedVerifyPassword = jest.mocked(verifyPassword);

describe('AuthService', () => {
  let usersService: {
    findOne: jest.Mock;
    findByPk: jest.Mock;
    updateByPk: jest.Mock;
    markAsVerified: jest.Mock;
    transaction: jest.Mock;
  };
  let sessionsService: { createSession: jest.Mock; revokeSession: jest.Mock };
  let permissionsService: { getEffectivePermissions: jest.Mock };
  let userTwoFactorMethodsService: {
    enableEmail: jest.Mock;
    findEnabledByType: jest.Mock;
    touchLastUsed: jest.Mock;
  };
  let userTwoFactorCodesService: {
    issueEmailCode: jest.Mock;
    verifyCode: jest.Mock;
  };
  let service: AuthService;

  const transaction = { id: 'tx' };
  const dto = { email: 'ana@example.com', password: 'abcd-efgh-ijkl' };
  const metadata = { ipAddress: '203.0.113.7', userAgent: 'Mozilla/5.0' };
  // Ya pasó su primer login: verificado y con 2FA por correo.
  const user = {
    id: 'user-id',
    organizationId: 'org-id',
    firstName: 'Ana',
    email: 'ana@example.com',
    password: 'stored-hash',
    status: UserStatusEnum.ACTIVE,
    isActive: true,
    isVerified: true,
    twoFactorEnabled: true,
    organization: { id: 'org-id', isActive: true },
  };
  const newUser = {
    ...user,
    status: UserStatusEnum.PENDING,
    isVerified: false,
    twoFactorEnabled: false,
  };
  const session = {
    id: 'session-id',
    expiresAt: new Date('2026-10-05T12:00:00Z'),
    lastActivityAt: new Date('2026-10-04T12:00:00Z'),
  };
  const sessionResponse = {
    twoFactorRequired: false,
    accessToken: 'plain-token',
    tokenType: 'Bearer',
    expiresAt: session.expiresAt,
  };
  const challenge = {
    challengeId: '0199b6a4-0000-7000-8000-000000000001',
    expiresAt: new Date('2026-10-04T12:10:00Z'),
  };
  const auth = authContextFixture();

  beforeEach(() => {
    usersService = {
      findOne: jest.fn().mockResolvedValue(user),
      findByPk: jest.fn().mockResolvedValue({ id: 'user-id' }),
      updateByPk: jest.fn().mockResolvedValue(undefined),
      markAsVerified: jest.fn().mockResolvedValue(true),
      transaction: jest.fn((run: (tx: unknown) => unknown) => run(transaction)),
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
    userTwoFactorMethodsService = {
      enableEmail: jest.fn().mockResolvedValue({ id: 'method-id' }),
      findEnabledByType: jest
        .fn()
        .mockResolvedValue({
          id: 'method-id',
          type: TwoFactorMethodEnum.EMAIL,
        }),
      touchLastUsed: jest.fn().mockResolvedValue(undefined),
    };
    userTwoFactorCodesService = {
      issueEmailCode: jest.fn().mockResolvedValue(challenge),
      verifyCode: jest.fn().mockResolvedValue('user-id'),
    };
    mockedVerifyPassword.mockResolvedValue(true);

    service = new AuthService(
      usersService as unknown as UsersService,
      sessionsService as unknown as SessionsService,
      permissionsService as unknown as PermissionsService,
      userTwoFactorMethodsService as unknown as UserTwoFactorMethodsService,
      userTwoFactorCodesService as unknown as UserTwoFactorCodesService,
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
          attributes: expect.arrayContaining([
            'password',
            'isVerified',
            'twoFactorEnabled',
          ]) as unknown,
        }),
      );
      expect(mockedVerifyPassword).toHaveBeenCalledWith(
        dto.password,
        'stored-hash',
      );
    });

    describe('on the first login (user not verified yet)', () => {
      beforeEach(() => {
        usersService.findOne.mockResolvedValue(newUser);
      });

      it('returns a Bearer session directly, never the password', async () => {
        const result = await service.login(dto, metadata);

        expect(result).toEqual(sessionResponse);
        expect(JSON.stringify(result)).not.toContain('stored-hash');
        expect(userTwoFactorCodesService.issueEmailCode).not.toHaveBeenCalled();
      });

      it('activates and verifies the user and enables email as default 2FA', async () => {
        await service.login(dto, metadata);

        const [userId, verifiedAt, tx] = usersService.markAsVerified.mock
          .calls[0] as [string, Date, unknown];
        expect(userId).toBe('user-id');
        expect(verifiedAt).toBeInstanceOf(Date);
        expect(tx).toBe(transaction);
        expect(userTwoFactorMethodsService.enableEmail).toHaveBeenCalledWith(
          'user-id',
          verifiedAt,
          transaction,
        );
      });

      it('does everything in one transaction together with the session', async () => {
        await service.login(dto, metadata);

        expect(usersService.transaction).toHaveBeenCalledTimes(1);
        expect(sessionsService.createSession).toHaveBeenCalledWith(
          newUser,
          metadata,
          transaction,
        );
        expect(usersService.updateByPk).toHaveBeenCalledWith(
          'user-id',
          { lastLoginAt: session.lastActivityAt },
          { transaction },
        );
      });

      it('does not enable 2FA twice when a concurrent login already verified the user', async () => {
        usersService.markAsVerified.mockResolvedValue(false);

        await expect(service.login(dto, metadata)).resolves.toEqual(
          sessionResponse,
        );
        expect(userTwoFactorMethodsService.enableEmail).not.toHaveBeenCalled();
      });

      it('propagates a failure so the transaction rolls back', async () => {
        userTwoFactorMethodsService.enableEmail.mockRejectedValue(
          new Error('db down'),
        );

        await expect(service.login(dto, metadata)).rejects.toThrow('db down');
        expect(sessionsService.createSession).not.toHaveBeenCalled();
      });
    });

    describe('when the user has 2FA enabled', () => {
      it('sends an email code and returns a challenge instead of a session', async () => {
        await expect(service.login(dto, metadata)).resolves.toEqual({
          twoFactorRequired: true,
          method: TwoFactorMethodEnum.EMAIL,
          ...challenge,
        });
        expect(
          userTwoFactorMethodsService.findEnabledByType,
        ).toHaveBeenCalledWith('user-id', TwoFactorMethodEnum.EMAIL);
        expect(userTwoFactorCodesService.issueEmailCode).toHaveBeenCalledWith(
          user,
        );
        expect(sessionsService.createSession).not.toHaveBeenCalled();
        expect(usersService.updateByPk).not.toHaveBeenCalled();
      });

      it('does not verify the user again', async () => {
        await service.login(dto, metadata);

        expect(usersService.markAsVerified).not.toHaveBeenCalled();
        expect(userTwoFactorMethodsService.enableEmail).not.toHaveBeenCalled();
      });

      it('refuses to log in without a usable method instead of skipping 2FA', async () => {
        userTwoFactorMethodsService.findEnabledByType.mockResolvedValue(null);

        await expect(service.login(dto, metadata)).rejects.toThrow(
          new ForbiddenException(TWO_FACTOR_UNAVAILABLE_MESSAGE),
        );
        expect(userTwoFactorCodesService.issueEmailCode).not.toHaveBeenCalled();
        expect(sessionsService.createSession).not.toHaveBeenCalled();
      });
    });

    it('opens a session directly for a verified user without 2FA', async () => {
      usersService.findOne.mockResolvedValue({
        ...user,
        twoFactorEnabled: false,
      });

      await expect(service.login(dto, metadata)).resolves.toEqual(
        sessionResponse,
      );
      expect(usersService.updateByPk).toHaveBeenCalledWith(
        'user-id',
        { lastLoginAt: session.lastActivityAt },
        { transaction: undefined },
      );
      expect(userTwoFactorCodesService.issueEmailCode).not.toHaveBeenCalled();
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

    it.each([
      ['a verified user', user],
      ['a user on their first login', newUser],
    ])(
      'rejects a wrong password for %s without side effects',
      async (_label, found) => {
        usersService.findOne.mockResolvedValue(found);
        mockedVerifyPassword.mockResolvedValue(false);

        await expect(service.login(dto, metadata)).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
        expect(sessionsService.createSession).not.toHaveBeenCalled();
        expect(usersService.updateByPk).not.toHaveBeenCalled();
        expect(usersService.markAsVerified).not.toHaveBeenCalled();
        expect(userTwoFactorCodesService.issueEmailCode).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['suspended', { status: UserStatusEnum.SUSPENDED }],
      ['blocked', { status: UserStatusEnum.BLOCKED }],
      ['inactive', { isActive: false }],
      ['in an inactive organization', { organization: { isActive: false } }],
    ])('throws ForbiddenException for a user %s', async (_label, overrides) => {
      usersService.findOne.mockResolvedValue({ ...newUser, ...overrides });

      await expect(service.login(dto, metadata)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(sessionsService.createSession).not.toHaveBeenCalled();
      expect(usersService.markAsVerified).not.toHaveBeenCalled();
      expect(userTwoFactorCodesService.issueEmailCode).not.toHaveBeenCalled();
    });
  });

  describe('verifyTwoFactor', () => {
    const verifyDto = { challengeId: challenge.challengeId, code: '123456' };
    const sessionUser = {
      id: 'user-id',
      organizationId: 'org-id',
      status: UserStatusEnum.ACTIVE,
      isActive: true,
      organization: { id: 'org-id', isActive: true },
    };

    beforeEach(() => {
      usersService.findByPk.mockResolvedValue(sessionUser);
    });

    it('opens a session for the owner of a valid code', async () => {
      await expect(
        service.verifyTwoFactor(verifyDto, metadata),
      ).resolves.toEqual(sessionResponse);
      expect(userTwoFactorCodesService.verifyCode).toHaveBeenCalledWith(
        verifyDto.challengeId,
        verifyDto.code,
      );
      expect(usersService.findByPk).toHaveBeenCalledWith(
        'user-id',
        false,
        expect.objectContaining({
          attributes: ['id', 'organizationId', 'status', 'isActive'],
        }),
      );
      expect(sessionsService.createSession).toHaveBeenCalledWith(
        sessionUser,
        metadata,
        transaction,
      );
    });

    it('records the login and the method usage in the same transaction', async () => {
      await service.verifyTwoFactor(verifyDto, metadata);

      expect(usersService.updateByPk).toHaveBeenCalledWith(
        'user-id',
        { lastLoginAt: session.lastActivityAt },
        { transaction },
      );
      expect(userTwoFactorMethodsService.touchLastUsed).toHaveBeenCalledWith(
        'user-id',
        TwoFactorMethodEnum.EMAIL,
        expect.any(Date),
        transaction,
      );
    });

    it('propagates an invalid code without opening a session', async () => {
      userTwoFactorCodesService.verifyCode.mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(
        service.verifyTwoFactor(verifyDto, metadata),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(usersService.findByPk).not.toHaveBeenCalled();
      expect(sessionsService.createSession).not.toHaveBeenCalled();
    });

    it.each([
      ['no longer exists', null],
      [
        'was suspended meanwhile',
        { ...sessionUser, status: UserStatusEnum.SUSPENDED },
      ],
      ['was deactivated meanwhile', { ...sessionUser, isActive: false }],
      [
        'belongs to an inactive organization',
        { ...sessionUser, organization: { isActive: false } },
      ],
    ])('rejects when the user %s', async (_label, found) => {
      usersService.findByPk.mockResolvedValue(found);

      await expect(
        service.verifyTwoFactor(verifyDto, metadata),
      ).rejects.toThrow(new ForbiddenException(ACCOUNT_DISABLED_MESSAGE));
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
