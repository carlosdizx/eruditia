import type { Request } from 'express';
import AuthContextInterface from './auth-context.interface';

export default interface AuthenticatedRequestInterface extends Request {
  auth?: AuthContextInterface;
}
