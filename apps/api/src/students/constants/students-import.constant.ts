export const CSV_MAX_ROWS = 2000;
export const CSV_MAX_FILE_SIZE = 2 * 1024 * 1024;

export const CSV_INVALID_MESSAGE = 'El archivo no es un CSV válido';
export const CSV_EMPTY_MESSAGE = 'El archivo no tiene estudiantes';
export const CSV_TOO_MANY_ROWS_MESSAGE = `El archivo supera el máximo de ${CSV_MAX_ROWS} estudiantes por importación`;
export const DUPLICATED_IN_FILE_MESSAGE = (line: number) =>
  `documento repetido en el archivo (línea ${line})`;
