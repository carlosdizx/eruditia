import 'reflect-metadata';
import SessionsController from '@auth/sessions/sessions.controller';
import SessionsService from '@auth/sessions/sessions.service';
import authContextFixture from '../fixtures/auth-context.fixture';

describe('SessionsController', () => {
  let sessionsService: {
    listActiveSessions: jest.Mock;
    revokeAllSessions: jest.Mock;
    revokeSession: jest.Mock;
  };
  let controller: SessionsController;
  const auth = authContextFixture();

  beforeEach(() => {
    sessionsService = {
      listActiveSessions: jest.fn().mockResolvedValue([{ id: 'session-id' }]),
      revokeAllSessions: jest.fn().mockResolvedValue(2),
      revokeSession: jest.fn().mockResolvedValue(undefined),
    };
    controller = new SessionsController(
      sessionsService as unknown as SessionsService,
    );
  });

  it('lists the sessions of the current user', async () => {
    await expect(controller.listSessions(auth)).resolves.toEqual([
      { id: 'session-id' },
    ]);
    expect(sessionsService.listActiveSessions).toHaveBeenCalledWith('user-id');
  });

  it('revokes every other session but keeps the current one', async () => {
    await expect(controller.revokeOtherSessions(auth)).resolves.toBeUndefined();
    expect(sessionsService.revokeAllSessions).toHaveBeenCalledWith(
      'user-id',
      'session-id',
    );
  });

  it('revokes a specific session of the current user', async () => {
    await expect(
      controller.revokeSession(auth, 'other-session'),
    ).resolves.toBeUndefined();
    expect(sessionsService.revokeSession).toHaveBeenCalledWith(
      'other-session',
      'user-id',
    );
  });
});
