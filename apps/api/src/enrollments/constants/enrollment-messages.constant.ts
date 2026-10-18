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
export const SAME_YEAR_PROMOTION_MESSAGE =
  'El año destino debe ser distinto al de origen';
export const PAST_YEAR_PROMOTION_MESSAGE =
  'El año destino debe empezar después del año de origen';
export const CLOSED_TARGET_YEAR_MESSAGE =
  'El año destino está cerrado: no se puede matricular en él';
export const INVALID_PROMOTION_ENROLLMENTS_MESSAGE =
  'Algunas matrículas ya no están en curso en el salón de origen';
export const GRADUATE_NOT_FINAL_MESSAGE =
  'Solo se puede graduar desde el último grado';
export const PROMOTE_FINAL_MESSAGE =
  'Desde el último grado no se promueve: se gradúa';
export const PROMOTION_TARGET_REQUIRED_MESSAGE =
  'Elige el salón destino de cada estudiante que promueve o repite';
export const INVALID_PROMOTION_TARGET_MESSAGE =
  'El salón destino debe ser del año destino y del grado que corresponde';
export const ADJUSTMENT_REASON_REQUIRED_MESSAGE = (student: string) =>
  `Escribe en la observación por qué ajustas el promedio de ${student}`;
export const MANUAL_DECISION_REASON_REQUIRED_MESSAGE = (student: string) =>
  `La decisión de ${student} no coincide con sus notas: escribe el motivo en la observación`;
export const ADJUSTED_AVERAGE_RANGE_MESSAGE = (
  student: string,
  min: string,
  max: string,
) => `El promedio ajustado de ${student} debe estar entre ${min} y ${max}`;
export const TARGET_CLASSROOM_FULL_MESSAGE = (name: string, capacity: number) =>
  `El salón ${name} no tiene cupo suficiente (cupo: ${capacity})`;
export const CLASSROOM_HAS_ENROLLMENTS_MESSAGE =
  'No puedes eliminar el salón: tiene estudiantes matriculados';
