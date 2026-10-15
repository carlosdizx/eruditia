// Espejo de PermissionEnum de la API (apps/api/src/common/enums/permission.enum.ts).
export const Permission = {
  USER_LIST: 'user:list',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  ROLE_LIST: 'role:list',
  STUDENT_LIST: 'student:list',
  STUDENT_CREATE: 'student:create',
  STUDENT_UPDATE: 'student:update',
  STUDENT_IMPORT: 'student:import',
  ACADEMIC_YEAR_LIST: 'academic-year:list',
  ACADEMIC_YEAR_CREATE: 'academic-year:create',
  ACADEMIC_YEAR_UPDATE: 'academic-year:update',
  ACADEMIC_YEAR_DELETE: 'academic-year:delete',
  GRADE_LEVEL_LIST: 'grade-level:list',
  GRADE_LEVEL_CREATE: 'grade-level:create',
  GRADE_LEVEL_UPDATE: 'grade-level:update',
  GRADE_LEVEL_DELETE: 'grade-level:delete',
  CLASSROOM_LIST: 'classroom:list',
  CLASSROOM_CREATE: 'classroom:create',
  CLASSROOM_UPDATE: 'classroom:update',
  CLASSROOM_DELETE: 'classroom:delete',
  SUBJECT_LIST: 'subject:list',
  SUBJECT_CREATE: 'subject:create',
  SUBJECT_UPDATE: 'subject:update',
  SUBJECT_DELETE: 'subject:delete',
  CLASSROOM_SUBJECT_LIST: 'classroom-subject:list',
  CLASSROOM_SUBJECT_ASSIGN: 'classroom-subject:assign',
  ENROLLMENT_LIST: 'enrollment:list',
  ENROLLMENT_CREATE: 'enrollment:create',
  ENROLLMENT_UPDATE: 'enrollment:update',
  ENROLLMENT_DELETE: 'enrollment:delete',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const PERMISSION_LABELS: Record<string, string> = {
  [Permission.USER_LIST]: 'Ver usuarios',
  [Permission.USER_CREATE]: 'Crear usuarios',
  [Permission.USER_UPDATE]: 'Editar usuarios',
  [Permission.USER_DELETE]: 'Eliminar usuarios',
  [Permission.ROLE_LIST]: 'Ver roles',
  [Permission.STUDENT_LIST]: 'Ver estudiantes',
  [Permission.STUDENT_CREATE]: 'Matricular estudiantes',
  [Permission.STUDENT_UPDATE]: 'Editar estudiantes',
  [Permission.STUDENT_IMPORT]: 'Importar estudiantes (CSV)',
  [Permission.ACADEMIC_YEAR_LIST]: 'Ver años lectivos',
  [Permission.ACADEMIC_YEAR_CREATE]: 'Crear años lectivos',
  [Permission.ACADEMIC_YEAR_UPDATE]: 'Editar años lectivos y periodos',
  [Permission.ACADEMIC_YEAR_DELETE]: 'Eliminar años lectivos',
  [Permission.GRADE_LEVEL_LIST]: 'Ver grados',
  [Permission.GRADE_LEVEL_CREATE]: 'Crear grados',
  [Permission.GRADE_LEVEL_UPDATE]: 'Editar grados',
  [Permission.GRADE_LEVEL_DELETE]: 'Eliminar grados',
  [Permission.CLASSROOM_LIST]: 'Ver salones',
  [Permission.CLASSROOM_CREATE]: 'Crear salones',
  [Permission.CLASSROOM_UPDATE]: 'Editar salones',
  [Permission.CLASSROOM_DELETE]: 'Eliminar salones',
  [Permission.SUBJECT_LIST]: 'Ver materias',
  [Permission.SUBJECT_CREATE]: 'Crear materias',
  [Permission.SUBJECT_UPDATE]: 'Editar materias',
  [Permission.SUBJECT_DELETE]: 'Eliminar materias',
  [Permission.CLASSROOM_SUBJECT_LIST]: 'Ver carga académica',
  [Permission.CLASSROOM_SUBJECT_ASSIGN]: 'Asignar materias a salones',
  [Permission.ENROLLMENT_LIST]: 'Ver listas de clase',
  [Permission.ENROLLMENT_CREATE]: 'Matricular en salones',
  [Permission.ENROLLMENT_UPDATE]: 'Cambiar de salón o retirar',
  [Permission.ENROLLMENT_DELETE]: 'Anular matrículas',
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

// Espejo de los @AuthWithPermissions de StudentsController.
export const STUDENT_GRANTS = {
  list: { permission: Permission.STUDENT_LIST, role: 'ADMIN' },
  create: { permission: Permission.STUDENT_CREATE, role: 'ADMIN' },
  update: { permission: Permission.STUDENT_UPDATE, role: 'ADMIN' },
  import: { permission: Permission.STUDENT_IMPORT, role: 'ADMIN' },
} satisfies Record<string, Grant>;

// Espejo de los @AuthWithPermissions de AcademicYearsController.
export const ACADEMIC_YEAR_GRANTS = {
  list: { permission: Permission.ACADEMIC_YEAR_LIST, role: 'ADMIN' },
  create: { permission: Permission.ACADEMIC_YEAR_CREATE, role: 'ADMIN' },
  update: { permission: Permission.ACADEMIC_YEAR_UPDATE, role: 'ADMIN' },
  delete: { permission: Permission.ACADEMIC_YEAR_DELETE, role: 'ADMIN' },
} satisfies Record<string, Grant>;

// Espejo de los @AuthWithPermissions de GradeLevelsController.
export const GRADE_LEVEL_GRANTS = {
  list: { permission: Permission.GRADE_LEVEL_LIST, role: 'ADMIN' },
  create: { permission: Permission.GRADE_LEVEL_CREATE, role: 'ADMIN' },
  update: { permission: Permission.GRADE_LEVEL_UPDATE, role: 'ADMIN' },
  delete: { permission: Permission.GRADE_LEVEL_DELETE, role: 'ADMIN' },
} satisfies Record<string, Grant>;

// Espejo de los @AuthWithPermissions de ClassroomsController.
export const CLASSROOM_GRANTS = {
  list: { permission: Permission.CLASSROOM_LIST, role: 'ADMIN' },
  create: { permission: Permission.CLASSROOM_CREATE, role: 'ADMIN' },
  update: { permission: Permission.CLASSROOM_UPDATE, role: 'ADMIN' },
  delete: { permission: Permission.CLASSROOM_DELETE, role: 'ADMIN' },
} satisfies Record<string, Grant>;

// Espejo de los @AuthWithPermissions de SubjectsController.
export const SUBJECT_GRANTS = {
  list: { permission: Permission.SUBJECT_LIST, role: 'ADMIN' },
  create: { permission: Permission.SUBJECT_CREATE, role: 'ADMIN' },
  update: { permission: Permission.SUBJECT_UPDATE, role: 'ADMIN' },
  delete: { permission: Permission.SUBJECT_DELETE, role: 'ADMIN' },
} satisfies Record<string, Grant>;

// Espejo de los @AuthWithPermissions de ClassroomSubjectsController.
export const CLASSROOM_SUBJECT_GRANTS = {
  list: { permission: Permission.CLASSROOM_SUBJECT_LIST, role: 'ADMIN' },
  assign: { permission: Permission.CLASSROOM_SUBJECT_ASSIGN, role: 'ADMIN' },
  // "Mis clases" del profesor.
  mine: { permission: Permission.CLASSROOM_SUBJECT_LIST, role: 'TEACHER' },
} satisfies Record<string, Grant>;

// Espejo de los @AuthWithPermissions de EnrollmentsController.
export const ENROLLMENT_GRANTS = {
  list: { permission: Permission.ENROLLMENT_LIST, role: 'ADMIN' },
  create: { permission: Permission.ENROLLMENT_CREATE, role: 'ADMIN' },
  update: { permission: Permission.ENROLLMENT_UPDATE, role: 'ADMIN' },
  delete: { permission: Permission.ENROLLMENT_DELETE, role: 'ADMIN' },
} satisfies Record<string, Grant>;
