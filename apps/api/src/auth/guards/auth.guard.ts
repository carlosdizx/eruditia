import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import SessionsService from '../sessions/sessions.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import extractBearerToken from '../utils/bearer-token.util';
import AuthenticatedRequestInterface from '../interfaces/authenticated-request.interface';
import { MISSING_TOKEN_MESSAGE } from '../constants/auth-messages.constant';

@Injectable()
export default class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionsService: SessionsService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequestInterface>();

    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException(MISSING_TOKEN_MESSAGE);

    request.auth = await this.sessionsService.validateSession(token);

    return true;
  }
}
