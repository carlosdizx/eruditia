export const ACADEMIC_YEAR_NOT_FOUND_MESSAGE = 'Año lectivo no encontrado';
export const ACADEMIC_PERIOD_NOT_FOUND_MESSAGE = 'Periodo no encontrado';
export const ACADEMIC_YEAR_NAME_IN_USE_MESSAGE =
  'Ya existe un año lectivo con ese nombre en tu organización';
export const INVALID_DATE_RANGE_MESSAGE =
  'La fecha de fin debe ser posterior a la de inicio';
export const INVALID_DATE_MESSAGE = 'La fecha debe tener el formato AAAA-MM-DD';
export const CLOSED_YEAR_MESSAGE =
  'El año lectivo está cerrado: reábrelo para modificar sus periodos';
export const ACTIVE_YEAR_DELETE_MESSAGE =
  'No puedes eliminar el año lectivo activo: activa otro primero';
export const PERIOD_NOT_IN_YEAR_MESSAGE =
  'Uno de los periodos no pertenece a este año lectivo';
export const PERIODS_SUM_MESSAGE = (sum: number) =>
  `Los porcentajes de los periodos deben sumar 100% (suman ${sum}%)`;
