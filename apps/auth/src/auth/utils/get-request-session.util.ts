import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import RequestSession from '@auth/types/request-session.type';

interface RequestWithSession {
  session?: RequestSession | null;
}

// The global AuthGuard runs before any route guard and stores the session on
// the request. A missing one here means the route was marked anonymous but
// still asked for an authorization check — treat it as unauthenticated.
const getRequestSession = (context: ExecutionContext): RequestSession => {
  const request = context.switchToHttp().getRequest<RequestWithSession>();

  if (!request.session) throw new UnauthorizedException();

  return request.session;
};

export default getRequestSession;
