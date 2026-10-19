import 'reflect-metadata';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import HealthService from '../../src/health/health.service';

describe('HealthService', () => {
  const now = new Date('2026-10-19T15:00:00.000Z');
  let sequelize: { query: jest.Mock };
  let service: HealthService;

  beforeEach(() => {
    jest.useFakeTimers({ now });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    sequelize = {
      query: jest
        .fn()
        .mockResolvedValue([
          { time: new Date('2026-10-19T15:00:01.000Z'), timezone: 'UTC' },
        ]),
    };
    service = new HealthService(sequelize as unknown as Sequelize);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns the server and database clocks', async () => {
    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      server: { time: now, timezone: expect.any(String) },
      database: {
        time: new Date('2026-10-19T15:00:01.000Z'),
        timezone: 'UTC',
      },
    });
  });

  it('reads the clock from the database', async () => {
    await service.check();

    expect(sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('NOW()'),
      { type: QueryTypes.SELECT },
    );
  });

  it('responds 503 with the server clock when the database is down', async () => {
    sequelize.query.mockRejectedValue(new Error('connection refused'));

    const error = (await service
      .check()
      .catch((caught: unknown) => caught)) as ServiceUnavailableException;

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.getResponse()).toEqual({
      status: 'error',
      server: { time: now, timezone: expect.any(String) },
      database: null,
    });
  });
});
