// Formato: <recurso>:<acción>. Es la fuente de verdad del catálogo: al
// arrancar la app se sincroniza con la tabla permissions.
enum PermissionEnum {
  USER_LIST = 'user:list',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  ROLE_LIST = 'role:list',
}

export default PermissionEnum;
