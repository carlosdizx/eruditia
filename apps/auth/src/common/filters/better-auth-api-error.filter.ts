import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { APIError } from 'better-auth/api';

// Errors thrown by `auth.api.*` calls made from our services are Better
// Auth's APIError, which Nest doesn't know — without this they'd surface as
// 500. Turned into the equivalent HttpException so the response keeps Nest's
// usual shape and status code.
@Catch(APIError)
export default class BetterAuthApiErrorFilter extends BaseExceptionFilter {
  public catch(error: APIError, host: ArgumentsHost): void {
    const message = error.body?.message ?? error.message;

    super.catch(
      new HttpException(
        { statusCode: error.statusCode, message, code: error.body?.code },
        error.statusCode,
        { cause: error },
      ),
      host,
    );
  }
}
