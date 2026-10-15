import PermissionEnum from '@common/enums/permission.enum';

// Record obliga a describir cada permiso nuevo del enum.
const permissionDescriptions: Record<PermissionEnum, string> = {
  [PermissionEnum.USER_LIST]: 'Listar usuarios de la organización',
  [PermissionEnum.USER_CREATE]: 'Crear usuarios en la organización',
  [PermissionEnum.USER_UPDATE]: 'Editar usuarios de la organización',
  [PermissionEnum.USER_DELETE]: 'Eliminar usuarios de la organización',
  [PermissionEnum.ROLE_LIST]: 'Listar roles disponibles',
  [PermissionEnum.STUDENT_LIST]: 'Listar estudiantes de la organización',
  [PermissionEnum.STUDENT_CREATE]: 'Matricular estudiantes en la organización',
  [PermissionEnum.STUDENT_UPDATE]:
    'Editar estudiantes y cambiar su estado en la organización',
  [PermissionEnum.STUDENT_IMPORT]: 'Importar estudiantes desde un archivo CSV',
  [PermissionEnum.ACADEMIC_YEAR_LIST]: 'Listar años lectivos y sus periodos',
  [PermissionEnum.ACADEMIC_YEAR_CREATE]: 'Crear años lectivos con sus periodos',
  [PermissionEnum.ACADEMIC_YEAR_UPDATE]:
    'Editar años lectivos, sus periodos y abrir o cerrar el ingreso de notas',
  [PermissionEnum.ACADEMIC_YEAR_DELETE]: 'Eliminar años lectivos',
  [PermissionEnum.GRADE_LEVEL_LIST]: 'Listar grados escolares',
  [PermissionEnum.GRADE_LEVEL_CREATE]:
    'Crear grados escolares y cargar la plantilla estándar',
  [PermissionEnum.GRADE_LEVEL_UPDATE]: 'Editar grados escolares',
  [PermissionEnum.GRADE_LEVEL_DELETE]: 'Eliminar grados escolares',
  [PermissionEnum.CLASSROOM_LIST]: 'Listar salones por año lectivo',
  [PermissionEnum.CLASSROOM_CREATE]:
    'Crear salones y asignar director de grupo',
  [PermissionEnum.CLASSROOM_UPDATE]: 'Editar salones y su director de grupo',
  [PermissionEnum.CLASSROOM_DELETE]: 'Eliminar salones',
};

export interface PermissionCatalogEntry {
  key: PermissionEnum;
  resource: string;
  action: string;
  description: string;
}

const permissionCatalog = (): PermissionCatalogEntry[] =>
  Object.values(PermissionEnum).map((key) => {
    const [resource, action] = key.split(':');
    return { key, resource, action, description: permissionDescriptions[key] };
  });

export default permissionCatalog;
