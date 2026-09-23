import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import HealthController from '@controllers/health.controller';

const greetingHandler = (): object =>
  Object.getOwnPropertyDescriptor(HealthController.prototype, 'greeting')
    ?.value as object;

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('responds with ok and the current date', async () => {
    const now = new Date('2026-09-23T12:00:00.000Z');
    jest.useFakeTimers({ now });

    await expect(controller.greeting()).resolves.toEqual({
      ok: true,
      date: now,
    });
  });

  it('returns a new date on every call', async () => {
    jest.useFakeTimers({ now: new Date('2026-09-23T12:00:00.000Z') });
    const first = await controller.greeting();

    jest.setSystemTime(new Date('2026-09-23T12:00:05.000Z'));
    const second = await controller.greeting();

    expect(second.date.getTime() - first.date.getTime()).toBe(5000);
  });

  it('is served at GET / of the root path', () => {
    const handler = greetingHandler();

    expect(Reflect.getMetadata(PATH_METADATA, HealthController)).toBe('/');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.GET,
    );
  });

  it('allows anonymous access so the auth guard does not block it', () => {
    expect(Reflect.getMetadata('PUBLIC', greetingHandler())).toBe(true);
  });
});
