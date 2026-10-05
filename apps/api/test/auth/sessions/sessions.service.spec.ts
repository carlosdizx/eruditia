import 'reflect-metadata';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Op, Transaction } from 'sequelize';
import Env from '@common/schemas/env.schema';
import UserStatusEnum from '@common/enums/user-status.enum';
import RoleCategoryEnum from '@common/enums/role-category.enum';
import UserModel from '@database/models/user.model';
import SessionsService, {
  ACTIVITY_TOUCH_INTERVAL_MS,
} from '@auth/sessions/sessions.service';
import UserSessionRepository from '@auth/sessions/user-session.repository';
import { hashSessionToken } from '@auth/utils/session-token.util';

const NOW = new Date('2026-10-04T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

describe('SessionsService', () => {
  let repository: {
    create: jest.Mock;
    findOne: jest.Mock;
    findAll: jest.Mock;
    touch: jest.Mock;
    revokeMany: jest.Mock;
  };
  let configService: { get: jest.Mock };
  let service: SessionsService;

  const metadata = { ipAddress: '203.0.113.7', userAgent: 'Mozilla/5.0' };

  const storedUser = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-id',
    roleId: 'role-id',
    status: UserStatusEnum.ACTIVE,
    isActive: true,
    role: { id: 'role-id', name: 'ADMIN', category: RoleCategoryEnum.CLIENT },
    ...overrides,
  });

  const storedSession = (overrides: Record<string, unknown> = {}) => ({
    id: 'session-id',
    userId: 'user-id',
    organizationId: 'org-id',
    expiresAt: new Date(NOW.getTime() + HOUR_MS),
    lastActivityAt: new Date(NOW.getTime() - 5 * MINUTE_MS),
    revokedAt: null,
    user: storedUser(),
    organization: { id: 'org-id', isActive: true },
    ...overrides,
  });

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });

    repository = {
      create: jest.fn((dto: object) =>
        Promise.resolve({ id: 'session-id', ...dto }),
      ),
      findOne: jest.fn().mockResolvedValue(storedSession()),
      findAll: jest.fn().mockResolvedValue([]),
      touch: jest.fn().mockResolvedValue(undefined),
      revokeMany: jest.fn().mockResolvedValue(1),
    };
    configService = {
      get: jest.fn(
        (key: string) =>
          ({ SESSION_TTL_HOURS: 24, SESSION_IDLE_TIMEOUT_MINUTES: 120 })[key],
      ),
    };

    service = new SessionsService(
      repository as unknown as UserSessionRepository,
      configService as unknown as ConfigService<Env, true>,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createSession', () => {
    const user = { id: 'user-id', organizationId: 'org-id' } as UserModel;

    it('stores only the hash of the returned token', async () => {
      const { token } = await service.createSession(user, metadata);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tokenHash: hashSessionToken(token) }),
        { transaction: undefined },
      );
      expect(JSON.stringify(repository.create.mock.calls)).not.toContain(token);
    });

    it('links the session to the user, organization and request', async () => {
      await service.createSession(user, metadata);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          organizationId: 'org-id',
          ...metadata,
        }),
        expect.anything(),
      );
    });

    it('expires after SESSION_TTL_HOURS and starts its activity now', async () => {
      await service.createSession(user, metadata);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: new Date(NOW.getTime() + 24 * HOUR_MS),
          lastActivityAt: NOW,
        }),
        expect.anything(),
      );
    });

    it('generates a different token on every call', async () => {
      const first = await service.createSession(user, metadata);
      const second = await service.createSession(user, metadata);

      expect(first.token).not.toBe(second.token);
    });

    it('passes the transaction through', async () => {
      const transaction = { id: 'tx' } as unknown as Transaction;

      await service.createSession(user, metadata, transaction);

      expect(repository.create).toHaveBeenCalledWith(expect.anything(), {
        transaction,
      });
    });
  });

  describe('validateSession', () => {
    it('looks the session up by the token hash', async () => {
      await service.validateSession('token');

      expect(repository.findOne).toHaveBeenCalledWith(
        { tokenHash: hashSessionToken('token') },
        false,
        expect.objectContaining({ include: expect.any(Array) as unknown }),
      );
    });

    it('returns the identity of the user and their organization', async () => {
      await expect(service.validateSession('token')).resolves.toEqual({
        sessionId: 'session-id',
        userId: 'user-id',
        organizationId: 'org-id',
        roleId: 'role-id',
        roleName: 'ADMIN',
        roleCategory: RoleCategoryEnum.CLIENT,
        expiresAt: new Date(NOW.getTime() + HOUR_MS),
      });
    });

    it('exposes the role category for core roles', async () => {
      repository.findOne.mockResolvedValue(
        storedSession({
          organizationId: null,
          organization: null,
          user: storedUser({
            role: {
              id: 'role-id',
              name: 'SUPER_ADMIN',
              category: RoleCategoryEnum.CORE,
            },
          }),
        }),
      );

      await expect(service.validateSession('token')).resolves.toMatchObject({
        roleName: 'SUPER_ADMIN',
        roleCategory: RoleCategoryEnum.CORE,
        organizationId: null,
      });
    });

    const rejectsWith = async (overrides: Record<string, unknown>) => {
      repository.findOne.mockResolvedValue(storedSession(overrides));

      await expect(service.validateSession('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repository.touch).not.toHaveBeenCalled();
    };

    it('rejects an unknown token', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.validateSession('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a revoked session', () => rejectsWith({ revokedAt: NOW }));

    it('rejects an expired session', () => rejectsWith({ expiresAt: NOW }));

    it('rejects a session idle for longer than the timeout', () =>
      rejectsWith({
        lastActivityAt: new Date(NOW.getTime() - 120 * MINUTE_MS),
      }));

    it('rejects when the user no longer exists', () =>
      rejectsWith({ user: null }));

    it('rejects when the role no longer exists', () =>
      rejectsWith({ user: storedUser({ role: null }) }));

    it.each([UserStatusEnum.SUSPENDED, UserStatusEnum.BLOCKED])(
      'rejects a %s user',
      (status) => rejectsWith({ user: storedUser({ status }) }),
    );

    it('rejects an inactive user', () =>
      rejectsWith({ user: storedUser({ isActive: false }) }));

    it('rejects when the organization was deactivated', () =>
      rejectsWith({ organization: { id: 'org-id', isActive: false } }));

    it('refreshes lastActivityAt when the last one is old enough', async () => {
      await service.validateSession('token');

      expect(repository.touch).toHaveBeenCalledWith('session-id', NOW);
    });

    it('does not write on every request', async () => {
      repository.findOne.mockResolvedValue(
        storedSession({
          lastActivityAt: new Date(
            NOW.getTime() - ACTIVITY_TOUCH_INTERVAL_MS + 1,
          ),
        }),
      );

      await service.validateSession('token');

      expect(repository.touch).not.toHaveBeenCalled();
    });
  });

  describe('listActiveSessions', () => {
    it('lists only valid sessions of the user without the token hash', async () => {
      await service.listActiveSessions('user-id');

      expect(repository.findAll).toHaveBeenCalledWith(
        {
          userId: 'user-id',
          revokedAt: null,
          expiresAt: { [Op.gt]: NOW },
          lastActivityAt: {
            [Op.gt]: new Date(NOW.getTime() - 120 * MINUTE_MS),
          },
        },
        expect.objectContaining({ order: [['lastActivityAt', 'DESC']] }),
      );
      const [, options] = repository.findAll.mock.calls[0] as [
        unknown,
        { attributes: string[] },
      ];
      expect(options.attributes).not.toContain('tokenHash');
    });
  });

  describe('revokeSession', () => {
    it('revokes the session only if it belongs to the user', async () => {
      await service.revokeSession('session-id', 'user-id');

      expect(repository.revokeMany).toHaveBeenCalledWith({
        id: 'session-id',
        userId: 'user-id',
      });
    });

    it('throws NotFoundException when nothing was revoked', async () => {
      repository.revokeMany.mockResolvedValue(0);

      await expect(
        service.revokeSession('session-id', 'other-user'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('revokeAllSessions', () => {
    it('revokes every session of the user', async () => {
      await expect(service.revokeAllSessions('user-id')).resolves.toBe(1);

      expect(repository.revokeMany).toHaveBeenCalledWith({ userId: 'user-id' });
    });

    it('can keep one session alive', async () => {
      await service.revokeAllSessions('user-id', 'session-id');

      expect(repository.revokeMany).toHaveBeenCalledWith({
        userId: 'user-id',
        id: { [Op.ne]: 'session-id' },
      });
    });
  });
});
