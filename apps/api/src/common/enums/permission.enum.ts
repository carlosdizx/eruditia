// Formato: <recurso>:<acción>. Es la fuente de verdad del catálogo: al
// arrancar la app se sincroniza con la tabla permissions.
enum PermissionEnum {
  USER_LIST = 'user:list',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  ROLE_LIST = 'role:list',

  STUDENT_LIST = 'student:list',
  STUDENT_CREATE = 'student:create',
  STUDENT_UPDATE = 'student:update',
  STUDENT_IMPORT = 'student:import',

  ACADEMIC_YEAR_LIST = 'academic-year:list',
  ACADEMIC_YEAR_CREATE = 'academic-year:create',
  ACADEMIC_YEAR_UPDATE = 'academic-year:update',
  ACADEMIC_YEAR_DELETE = 'academic-year:delete',

  GRADE_LEVEL_LIST = 'grade-level:list',
  GRADE_LEVEL_CREATE = 'grade-level:create',
  GRADE_LEVEL_UPDATE = 'grade-level:update',
  GRADE_LEVEL_DELETE = 'grade-level:delete',

  CLASSROOM_LIST = 'classroom:list',
  CLASSROOM_CREATE = 'classroom:create',
  CLASSROOM_UPDATE = 'classroom:update',
  CLASSROOM_DELETE = 'classroom:delete',
}

export default PermissionEnum;
