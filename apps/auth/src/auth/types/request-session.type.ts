import { UserSession } from '@thallesp/nestjs-better-auth';
import { Auth } from '@common/config/auth.config';

// Session attached to the request by the global AuthGuard of
// @thallesp/nestjs-better-auth, typed with this app's plugins.
type RequestSession = UserSession<Auth>;

export default RequestSession;
