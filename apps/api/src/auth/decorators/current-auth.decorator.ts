import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import AuthenticatedRequestInterface from '../interfaces/authenticated-request.interface';
import AuthContextInterface from '../interfaces/auth-context.interface';

export const getCurrentAuth = (
  _data: unknown,
  context: ExecutionContext,
): AuthContextInterface => {
  const request = context
    .switchToHttp()
    .getRequest<AuthenticatedRequestInterface>();

  if (!request.auth) throw new UnauthorizedException();

  return request.auth;
};

const CurrentAuth = createParamDecorator(getCurrentAuth);

export default CurrentAuth;
