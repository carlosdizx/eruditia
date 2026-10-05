import { SetMetadata } from '@nestjs/common';
import AuthWithPermissionsOptionsInterface from '../interfaces/auth-with-permissions-options.interface';

export const AUTH_WITH_PERMISSIONS_KEY = 'authWithPermissions';

// La autenticación ya la exige el AuthGuard global; esto agrega la
// autorización por rol y/o permisos, que la evalúa el AuthorizationGuard.
const AuthWithPermissions = ({
  roles = [],
  permissions = [],
  mode = 'all',
}: AuthWithPermissionsOptionsInterface = {}) =>
  SetMetadata(AUTH_WITH_PERMISSIONS_KEY, { roles, permissions, mode });

export default AuthWithPermissions;
