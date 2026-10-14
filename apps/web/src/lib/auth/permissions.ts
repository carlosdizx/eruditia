// Espejo de PermissionEnum de la API (apps/api/src/common/enums/permission.enum.ts).
export const Permission = {
  USER_LIST: 'user:list',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  ROLE_LIST: 'role:list',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const PERMISSION_LABELS: Record<string, string> = {
  [Permission.USER_LIST]: 'Ver usuarios',
  [Permission.USER_CREATE]: 'Crear usuarios',
  [Permission.USER_UPDATE]: 'Editar usuarios',
  [Permission.USER_DELETE]: 'Eliminar usuarios',
  [Permission.ROLE_LIST]: 'Ver roles',
};

export const hasPermission = (
  permissions: readonly string[],
  permission: Permission,
) => permissions.includes(permission);
