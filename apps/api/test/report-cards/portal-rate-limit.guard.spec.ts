import { HttpException, HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import PortalRateLimitGuard, {
  MAX_PORTAL_LOOKUPS,
  PORTAL_WINDOW_MS,
} from '../../src/report-cards/guards/portal-rate-limit.guard';

const contextFor = (ip: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ ip }) }),
  }) as unknown as ExecutionContext;

describe('PortalRateLimitGuard', () => {
  let store: Map<string, unknown>;
  let cache: Record<string, jest.Mock>;
  let guard: PortalRateLimitGuard;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-17T12:00:00Z') });
    store = new Map();
    cache = {
      get: jest.fn((key: string) => Promise.resolve(store.get(key))),
      set: jest.fn((key: string, value: unknown) => {
        store.set(key, value);
        return Promise.resolve(value);
      }),
    };
    guard = new PortalRateLimitGuard(cache as unknown as Cache);
  });

  afterEach(() => jest.useRealTimers());

  const exhaust = async (ip: string) => {
    for (let i = 0; i < MAX_PORTAL_LOOKUPS; i++)
      await guard.canActivate(contextFor(ip));
  };

  it('lets a few lookups through and counts them per IP', async () => {
    await expect(guard.canActivate(contextFor('1.1.1.1'))).resolves.toBe(true);
    await expect(guard.canActivate(contextFor('1.1.1.1'))).resolves.toBe(true);

    expect(store.get('report-card-portal:1.1.1.1')).toMatchObject({
      count: 2,
    });
    expect(cache.set).toHaveBeenLastCalledWith(
      'report-card-portal:1.1.1.1',
      expect.any(Object),
      PORTAL_WINDOW_MS,
    );
  });

  it('rejects the IP after too many lookups in a minute', async () => {
    await exhaust('1.1.1.1');

    const error = await guard
      .canActivate(contextFor('1.1.1.1'))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    await expect(guard.canActivate(contextFor('2.2.2.2'))).resolves.toBe(true);
  });

  it('starts a new window after a minute', async () => {
    await exhaust('1.1.1.1');
    jest.advanceTimersByTime(PORTAL_WINDOW_MS);

    await expect(guard.canActivate(contextFor('1.1.1.1'))).resolves.toBe(true);
  });
});
