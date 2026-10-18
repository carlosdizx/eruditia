import RoleNameEnum from '@common/enums/role-name.enum';
import PermissionEnum from '@common/enums/permission.enum';

export default interface AuthWithPermissionsOptionsInterface {
  // Basta con tener uno de los roles.
  roles?: RoleNameEnum[];
  permissions?: PermissionEnum[];
  // 'all' (por defecto): todos los permisos. 'any': al menos uno.
  mode?: 'all' | 'any';
}
