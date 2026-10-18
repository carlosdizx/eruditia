import PermissionEnum from '@common/enums/permission.enum';

// Record obliga a describir cada permiso nuevo del enum.
const permissionDescriptions: Record<PermissionEnum, string> = {
  [PermissionEnum.USER_LIST]: 'Listar usuarios de la organización',
  [PermissionEnum.USER_CREATE]: 'Crear usuarios en la organización',
  [PermissionEnum.USER_UPDATE]: 'Editar usuarios de la organización',
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
  [PermissionEnum.SUBJECT_LIST]: 'Listar el catálogo de materias',
  [PermissionEnum.SUBJECT_CREATE]: 'Crear materias y cargar las materias base',
  [PermissionEnum.SUBJECT_UPDATE]: 'Editar materias',
  [PermissionEnum.SUBJECT_DELETE]: 'Eliminar materias',
  [PermissionEnum.CLASSROOM_SUBJECT_LIST]:
    'Ver la carga académica de los salones (los profesores, solo la suya)',
  [PermissionEnum.CLASSROOM_SUBJECT_ASSIGN]:
    'Asignar materias y profesores a los salones y copiar la estructura de otro año',
  [PermissionEnum.ENROLLMENT_LIST]:
    'Ver listas de clase e historial de los estudiantes (los profesores, solo de sus salones)',
  [PermissionEnum.ENROLLMENT_CREATE]:
    'Matricular estudiantes en los salones de un año lectivo',
  [PermissionEnum.ENROLLMENT_UPDATE]:
    'Cambiar de salón, retirar o trasladar estudiantes matriculados',
  [PermissionEnum.ENROLLMENT_DELETE]: 'Anular matrículas hechas por error',
  [PermissionEnum.ENROLLMENT_PROMOTE]:
    'Promover, reprobar o graduar a los estudiantes al cierre del año (asistente de promoción)',
  [PermissionEnum.GRADING_SCALE_UPDATE]:
    'Configurar la escala de calificación (mínima, máxima, aprobatoria y decimales)',
  [PermissionEnum.GRADE_LIST]:
    'Ver planillas de notas (los profesores, de sus materias y su dirección de grupo)',
  [PermissionEnum.GRADE_RECORD]:
    'Registrar notas y configurar actividades evaluativas (los profesores, solo en periodos abiertos)',
  [PermissionEnum.GRADE_RECOVER]:
    'Registrar recuperaciones de materias perdidas al final del año (los profesores, de sus materias)',
  [PermissionEnum.REPORT_CARD_VIEW]:
    'Boletín de notas: estudiantes y acudientes lo consultan en el portal público con año lectivo + documento; el admin y el director de grupo lo previsualizan',
  [PermissionEnum.REPORT_CARD_EXPORT]:
    'Generar y exportar boletines en PDF (individuales y por salón; los profesores, de su dirección de grupo)',
  [PermissionEnum.RANKING_VIEW]:
    'Rankings y cuadro de honor (los profesores, de su dirección de grupo y sus materias)',
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
