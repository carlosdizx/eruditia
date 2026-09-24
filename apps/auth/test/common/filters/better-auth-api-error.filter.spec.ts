import { ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { APIError } from 'better-auth/api';
import BetterAuthApiErrorFilter from '@common/filters/better-auth-api-error.filter';

describe('BetterAuthApiErrorFilter', () => {
  const host = {} as ArgumentsHost;
  let baseCatch: jest.SpyInstance;

  beforeEach(() => {
    baseCatch = jest
      .spyOn(BaseExceptionFilter.prototype, 'catch')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    baseCatch.mockRestore();
  });

  it('turns an APIError into the equivalent HttpException', () => {
    const error = new APIError('BAD_REQUEST', {
      message: 'Organization already exists',
      code: 'ORGANIZATION_ALREADY_EXISTS',
    });

    new BetterAuthApiErrorFilter().catch(error, host);

    const [exception, passedHost] = baseCatch.mock.calls[0] as [
      HttpException,
      ArgumentsHost,
    ];
    expect(passedHost).toBe(host);
    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toEqual({
      statusCode: 400,
      message: 'Organization already exists',
      code: 'ORGANIZATION_ALREADY_EXISTS',
    });
    expect(exception.cause).toBe(error);
  });

  it('keeps the status of the APIError', () => {
    new BetterAuthApiErrorFilter().catch(
      new APIError('FORBIDDEN', { message: 'Nope' }),
      host,
    );

    const [exception] = baseCatch.mock.calls[0] as [HttpException];
    expect(exception.getStatus()).toBe(403);
  });
});
