import 'reflect-metadata';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import HealthController from '../../src/health/health.controller';
import HealthService from '../../src/health/health.service';

describe('HealthController', () => {
  let healthService: { check: jest.Mock };
  let controller: HealthController;

  beforeEach(() => {
    healthService = { check: jest.fn().mockResolvedValue({ status: 'ok' }) };
    controller = new HealthController(
      healthService as unknown as HealthService,
    );
  });

  it('is public', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        Object.getOwnPropertyDescriptor(HealthController.prototype, 'check')!
          .value as object,
      ),
    ).toBe(true);
  });

  it('delegates to HealthService.check', async () => {
    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(healthService.check).toHaveBeenCalledTimes(1);
  });
});
