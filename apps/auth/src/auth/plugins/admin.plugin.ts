import { admin } from 'better-auth/plugins/admin';
import { systemRoles } from '@auth/access/system-access';
import SystemRole from '@auth/enums/system-role.enum';

const adminPlugin = () =>
  admin({
    roles: systemRoles,
    adminRoles: [SystemRole.SUPER_ADMIN],
    defaultRole: SystemRole.USER,
  });

export default adminPlugin;
