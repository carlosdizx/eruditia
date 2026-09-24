import {
  ForbiddenException,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import RolesGuard from '@auth/guards/roles.guard';
import { REQUIRED_ROLES_KEY } from '@auth/constants/auth-metadata.constants';
import findMemberRole from '@database/queries/find-member-role.query';
import { DrizzleDb } from '@database/types/drizzle.types';
import createExecutionContext from '../../fixtures/execution-context.fixture';

jest.mock('@database/queries/find-member-role.query', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const handlerRequiring = (roles?: string[]) => {
  const handler = () => undefined;
  if (roles) SetMetadata(REQUIRED_ROLES_KEY, roles)(handler);
  return handler;
};

const session = (activeOrganizationId: string | null = 'org-1') => ({
  user: { id: 'user-1' },
  session: { activeOrganizationId },
});

describe('RolesGuard', () => {
  const db = {} as DrizzleDb;
  const guard = new RolesGuard(new Reflector(), db);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lets the request through when no role is required', async () => {
    const context = createExecutionContext(
      { session: session() },
      handlerRequiring(),
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findMemberRole).not.toHaveBeenCalled();
  });

  it('lets a member with an allowed role through', async () => {
    jest.mocked(findMemberRole).mockResolvedValue('supervisor');
    const context = createExecutionContext(
      { session: session() },
      handlerRequiring(['admin', 'supervisor']),
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findMemberRole).toHaveBeenCalledWith(db, 'user-1', 'org-1');
  });

  it('reads the required roles from the controller too', async () => {
    jest.mocked(findMemberRole).mockResolvedValue('member');
    class Controller {}
    SetMetadata(REQUIRED_ROLES_KEY, ['admin'])(Controller);
    const context = createExecutionContext(
      { session: session() },
      handlerRequiring(),
      Controller,
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects a member without an allowed role with 403', async () => {
    jest.mocked(findMemberRole).mockResolvedValue('member');
    const context = createExecutionContext(
      { session: session() },
      handlerRequiring(['admin']),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('This action requires one of these roles: admin'),
    );
  });

  it('rejects a user who is not a member of the organization with 403', async () => {
    jest.mocked(findMemberRole).mockResolvedValue(null);
    const context = createExecutionContext(
      { session: session() },
      handlerRequiring(['admin']),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects a session without active organization with 403', async () => {
    const context = createExecutionContext(
      { session: session(null) },
      handlerRequiring(['admin']),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(findMemberRole).not.toHaveBeenCalled();
  });

  it('rejects a request without session with 401', async () => {
    const context = createExecutionContext(
      { session: null },
      handlerRequiring(['admin']),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
