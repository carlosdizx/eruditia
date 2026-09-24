import {
  ForbiddenException,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import FeatureGuard from '@auth/guards/feature.guard';
import { REQUIRED_FEATURES_KEY } from '@auth/constants/auth-metadata.constants';
import findOrganizationMetadata from '@database/queries/find-organization-metadata.query';
import { DrizzleDb } from '@database/types/drizzle.types';
import createExecutionContext from '../../fixtures/execution-context.fixture';

jest.mock('@database/queries/find-organization-metadata.query', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const handlerRequiring = (features?: string[]) => {
  const handler = () => undefined;
  if (features) SetMetadata(REQUIRED_FEATURES_KEY, features)(handler);
  return handler;
};

const session = (activeOrganizationId: string | null = 'org-1') => ({
  user: { id: 'user-1' },
  session: { activeOrganizationId },
});

describe('FeatureGuard', () => {
  const db = {} as DrizzleDb;
  const guard = new FeatureGuard(new Reflector(), db);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lets the request through when no feature is required', async () => {
    const context = createExecutionContext(
      { session: session() },
      handlerRequiring(),
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findOrganizationMetadata).not.toHaveBeenCalled();
  });

  it('lets an organization with the feature through', async () => {
    jest
      .mocked(findOrganizationMetadata)
      .mockResolvedValue('{"features":["finance_module","api:external"]}');
    const context = createExecutionContext(
      { session: session() },
      handlerRequiring(['finance_module']),
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findOrganizationMetadata).toHaveBeenCalledWith(db, 'org-1');
  });

  it('rejects an organization without the feature with 403', async () => {
    jest
      .mocked(findOrganizationMetadata)
      .mockResolvedValue('{"features":["api:external"]}');
    const context = createExecutionContext(
      { session: session() },
      handlerRequiring(['finance_module']),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException(
        'Your organization does not have access to: finance_module',
      ),
    );
  });

  it('requires every feature and lists the missing ones', async () => {
    jest
      .mocked(findOrganizationMetadata)
      .mockResolvedValue('{"features":["finance_module"]}');
    const context = createExecutionContext(
      { session: session() },
      handlerRequiring(['finance_module', 'reports:advanced', 'api:external']),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException(
        'Your organization does not have access to: reports:advanced, api:external',
      ),
    );
  });

  it.each([
    ['no metadata', null],
    ['malformed metadata', '{oops'],
  ])('rejects an organization with %s with 403', async (_label, metadata) => {
    jest.mocked(findOrganizationMetadata).mockResolvedValue(metadata);
    const context = createExecutionContext(
      { session: session() },
      handlerRequiring(['finance_module']),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects a session without active organization with 403', async () => {
    const context = createExecutionContext(
      { session: session(null) },
      handlerRequiring(['finance_module']),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(findOrganizationMetadata).not.toHaveBeenCalled();
  });

  it('rejects a request without session with 401', async () => {
    const context = createExecutionContext(
      { session: null },
      handlerRequiring(['finance_module']),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
