export const GRADEBOOK_NOT_FOUND_MESSAGE = 'Planilla no encontrada';
export const EVALUATION_ITEM_NOT_FOUND_MESSAGE = 'Actividad no encontrada';
export const STUDENT_GRADE_NOT_FOUND_MESSAGE = 'Nota no encontrada';
export const PERIOD_SUMMARY_NOT_FOUND_MESSAGE =
  'Definitiva del periodo no encontrada';
export const GRADEBOOK_PERIOD_NOT_FOUND_MESSAGE =
  'El periodo no pertenece al año lectivo de la planilla';
export const GRADEBOOK_READ_ONLY_MESSAGE =
  'Solo el profesor de la materia o un administrador pueden calificar';
export const GRADEBOOK_PERIOD_CLOSED_MESSAGE =
  'El periodo está cerrado para el ingreso de notas';
export const GRADEBOOK_YEAR_CLOSED_MESSAGE =
  'El año lectivo está cerrado: sus notas ya no se pueden modificar';
export const EVALUATION_ITEMS_WEIGHT_MESSAGE = (total: number) =>
  `Los pesos de las actividades deben sumar 100% (suman ${total}%)`;
export const INVALID_EVALUATION_ITEMS_MESSAGE =
  'Alguna actividad no pertenece a esta planilla';
export const INVALID_GRADE_ENROLLMENTS_MESSAGE =
  'Algún estudiante no está cursando en este salón';
export const SCORE_OUT_OF_RANGE_MESSAGE = (
  student: string,
  min: string,
  max: string,
) => `La nota de ${student} debe estar entre ${min} y ${max}`;
export const SCORE_DECIMALS_MESSAGE = (
  student: string,
  decimalPlaces: number,
) =>
  `La nota de ${student} admite como máximo ${decimalPlaces} ${decimalPlaces === 1 ? 'decimal' : 'decimales'}`;
