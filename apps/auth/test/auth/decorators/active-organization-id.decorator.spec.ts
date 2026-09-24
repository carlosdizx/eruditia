import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import ActiveOrganizationId from '@auth/decorators/active-organization-id.decorator';
import createExecutionContext from '../../fixtures/execution-context.fixture';

// Nest stores a param decorator's factory in the route args metadata; pull
// it out to call it the way Nest does.
const getFactory = () => {
  class Controller {
    public handler(@ActiveOrganizationId() _organizationId: string) {
      return undefined;
    }
  }

  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Controller,
    'handler',
  ) as Record<
    string,
    { factory: (data: unknown, context: unknown) => unknown }
  >;

  return Object.values(args)[0].factory;
};

describe('ActiveOrganizationId', () => {
  const factory = getFactory();

  it('resolves to the active organization of the session', () => {
    const context = createExecutionContext({
      session: {
        user: { id: 'user-1' },
        session: { activeOrganizationId: 'org-1' },
      },
    });

    expect(factory(undefined, context)).toBe('org-1');
  });

  it('throws 403 when the session has no active organization', () => {
    const context = createExecutionContext({
      session: {
        user: { id: 'user-1' },
        session: { activeOrganizationId: null },
      },
    });

    expect(() => factory(undefined, context)).toThrow(ForbiddenException);
  });

  it('throws 401 when there is no session', () => {
    expect(() =>
      factory(undefined, createExecutionContext({ session: null })),
    ).toThrow(UnauthorizedException);
  });
});
