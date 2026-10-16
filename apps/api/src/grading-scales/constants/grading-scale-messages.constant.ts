export const GRADING_SCALE_NOT_FOUND_MESSAGE =
  'Escala de calificación no encontrada';
export const GRADING_SCALE_RANGE_MESSAGE =
  'La nota mínima debe ser menor que la máxima';
export const GRADING_SCALE_PASSING_MESSAGE =
  'La nota aprobatoria debe ser mayor que la mínima y no superar la máxima';
export const GRADING_SCALE_DECIMALS_MESSAGE = (decimalPlaces: number) =>
  `Las notas de la escala admiten como máximo ${decimalPlaces} ${decimalPlaces === 1 ? 'decimal' : 'decimales'}`;
export const GRADING_SCALE_GRADES_OUTSIDE_MESSAGE = (score: number) =>
  `Hay notas registradas que no caben en la nueva escala (por ejemplo ${score}). Corrígelas antes de cambiarla`;
