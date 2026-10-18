import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import RequestMetadataInterface from '../interfaces/request-metadata.interface';

const USER_AGENT_MAX_LENGTH = 512;

export const getRequestMetadata = (
  _data: unknown,
  context: ExecutionContext,
): RequestMetadataInterface => {
  const request = context.switchToHttp().getRequest<Request>();
  const userAgent = request.headers['user-agent'];

  return {
    ipAddress: request.ip ?? null,
    userAgent: userAgent ? userAgent.slice(0, USER_AGENT_MAX_LENGTH) : null,
  };
};

const RequestMetadata = createParamDecorator(getRequestMetadata);

export default RequestMetadata;
