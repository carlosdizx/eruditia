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

// Lo que exige un endpoint: el permiso de la organización y, si la API lo pide,
// además un rol concreto.
export type Grant = { permission: Permission; role?: string };

export const isGranted = (
  user: { role: { name: string }; permissions: readonly string[] },
  { permission, role }: Grant,
) =>
  (!role || user.role.name === role) &&
  hasPermission(user.permissions, permission);

// Espejo de los @AuthWithPermissions de UsersController.
export const USER_GRANTS = {
  list: { permission: Permission.USER_LIST, role: 'ADMIN' },
  create: { permission: Permission.USER_CREATE, role: 'ADMIN' },
  update: { permission: Permission.USER_UPDATE, role: 'ADMIN' },
  delete: { permission: Permission.USER_DELETE, role: 'ADMIN' },
} satisfies Record<string, Grant>;
