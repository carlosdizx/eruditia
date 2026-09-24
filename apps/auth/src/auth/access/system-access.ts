import { adminAc, userAc } from 'better-auth/plugins/admin/access';
import SystemRole from '@auth/enums/system-role.enum';

// Only the super admin gets the admin() plugin's user/session management
// permissions; every other user has none.
export const systemRoles = {
  [SystemRole.SUPER_ADMIN]: adminAc,
  [SystemRole.USER]: userAc,
};
