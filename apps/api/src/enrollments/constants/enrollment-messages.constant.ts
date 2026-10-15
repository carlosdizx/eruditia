export const ENROLLMENT_NOT_FOUND_MESSAGE = 'Matrícula no encontrada';
export const CLOSED_YEAR_ENROLLMENTS_MESSAGE =
  'El año lectivo está cerrado: no se pueden modificar sus matrículas';
export const INVALID_STUDENTS_MESSAGE =
  'Solo se pueden matricular estudiantes activos de tu organización';
export const ALREADY_ENROLLED_MESSAGE = (names: string[]) =>
  `Ya tienen matrícula en este año lectivo: ${names.join(', ')}`;
export const CLASSROOM_FULL_MESSAGE = (capacity: number) =>
  `El salón no tiene cupo suficiente (cupo: ${capacity})`;
export const NOT_IN_PROGRESS_MESSAGE =
  'Solo se puede cambiar de salón una matrícula en curso';
export const OTHER_YEAR_CLASSROOM_MESSAGE =
  'El salón destino debe ser del mismo año lectivo';
export const CLASSROOM_HAS_ENROLLMENTS_MESSAGE =
  'No puedes eliminar el salón: tiene estudiantes matriculados';
