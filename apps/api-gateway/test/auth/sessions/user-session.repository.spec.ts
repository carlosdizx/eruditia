import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import AbstractRepository from '@database/repositories/abstract.repository';
import UserSessionModel from '@database/models/user-session.model';
import UserSessionRepository from '@auth/sessions/user-session.repository';

describe('UserSessionRepository', () => {
  let repository: UserSessionRepository;
  let update: jest.SpyInstance;

  beforeEach(() => {
    repository = new UserSessionRepository();
    repository.unassignLoggerError();
    update = jest.spyOn(UserSessionModel, 'update').mockResolvedValue([1]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extends AbstractRepository over UserSessionModel', () => {
    expect(repository).toBeInstanceOf(AbstractRepository);
    expect((repository as unknown as { model: unknown }).model).toBe(
      UserSessionModel,
    );
  });

  describe('touch', () => {
    it('updates only lastActivityAt of the given session', async () => {
      const now = new Date();

      await repository.touch('session-id', now);

      expect(update).toHaveBeenCalledWith(
        { lastActivityAt: now },
        { where: { id: 'session-id' } },
      );
    });

    it('wraps database errors in a ConflictException', async () => {
      update.mockRejectedValue(new Error('db down'));

      await expect(
        repository.touch('session-id', new Date()),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('revokeMany', () => {
    it('sets revokedAt only on sessions not revoked yet', async () => {
      await repository.revokeMany({ userId: 'user-id' });

      expect(update).toHaveBeenCalledWith(
        { revokedAt: expect.any(Date) as unknown },
        { where: { userId: 'user-id', revokedAt: null } },
      );
    });

    it('returns the number of revoked sessions', async () => {
      update.mockResolvedValue([3]);

      await expect(repository.revokeMany({ userId: 'user-id' })).resolves.toBe(
        3,
      );
    });

    it('wraps database errors in a ConflictException', async () => {
      update.mockRejectedValue(new Error('db down'));

      await expect(
        repository.revokeMany({ userId: 'user-id' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
