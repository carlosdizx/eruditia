import { BadRequestException } from '@nestjs/common';
import { CsvError, parse } from 'csv-parse/sync';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import CreateStudentDto from '../dto/create-student.dto';
import {
  CSV_EMPTY_MESSAGE,
  CSV_INVALID_MESSAGE,
  CSV_MAX_ROWS,
  CSV_TOO_MANY_ROWS_MESSAGE,
} from '../constants/students-import.constant';

// Columna del CSV -> campo de CreateStudentDto, en el orden de la plantilla.
export const CSV_COLUMNS = {
  documento: 'documentNumber',
  tipo_documento: 'documentType',
  nombres: 'firstName',
  apellidos: 'lastName',
  fecha_nacimiento: 'birthDate',
  nombre_acudiente: 'guardianName',
  telefono_acudiente: 'guardianPhone',
  correo_acudiente: 'guardianEmail',
} as const satisfies Record<string, keyof CreateStudentDto>;

type CsvColumn = keyof typeof CSV_COLUMNS;

const REQUIRED_COLUMNS: CsvColumn[] = [
  'documento',
  'tipo_documento',
  'nombres',
  'apellidos',
];

const COLUMN_OF = Object.fromEntries(
  Object.entries(CSV_COLUMNS).map(([column, field]) => [field, column]),
) as Record<string, CsvColumn>;

export interface CsvRow {
  // Línea del archivo (la 1 es el encabezado), para el resumen.
  line: number;
  values: Partial<Record<CsvColumn, string>>;
}

const normalizeHeader = (header: string) => header.trim().toLowerCase();

// Excel en español suele guardar con ";" y las fechas como DD/MM/AAAA.
export const parseStudentsCsv = (content: Buffer): CsvRow[] => {
  let records: { record: Record<string, string>; info: { lines: number } }[];

  try {
    records = parse(content, {
      bom: true,
      columns: (headers: string[]) => headers.map(normalizeHeader),
      delimiter: [',', ';'],
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      info: true,
    });
  } catch (error) {
    if (error instanceof CsvError)
      throw new BadRequestException(`${CSV_INVALID_MESSAGE}: ${error.message}`);
    throw error;
  }

  if (!records.length) throw new BadRequestException(CSV_EMPTY_MESSAGE);
  if (records.length > CSV_MAX_ROWS)
    throw new BadRequestException(CSV_TOO_MANY_ROWS_MESSAGE);

  const missing = REQUIRED_COLUMNS.filter(
    (column) => !(column in records[0].record),
  );
  if (missing.length)
    throw new BadRequestException(
      `Faltan columnas obligatorias: ${missing.join(', ')}`,
    );

  return records.map(({ record, info }) => ({
    line: info.lines,
    values: Object.fromEntries(
      Object.keys(CSV_COLUMNS)
        .filter((column) => record[column])
        .map((column) => [column, record[column]]),
    ),
  }));
};

const DAY_FIRST_DATE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

const normalizeDate = (value: string) => {
  const match = DAY_FIRST_DATE.exec(value);
  if (!match) return value;

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const errorMessage = (
  column: CsvColumn,
  value: string | undefined,
  constraints: Record<string, string> = {},
) => {
  if (value === undefined) return `${column} es obligatorio`;

  // Los @Matches y la fecha de la ficha ya traen un mensaje en español.
  const custom = constraints.matches ?? constraints.isIso8601;
  return custom
    ? `${column}: ${custom}`
    : `${column} no es válido ("${value}")`;
};

export type CsvRowResult =
  { ok: true; dto: CreateStudentDto } | { ok: false; messages: string[] };

// Valida la fila con las mismas reglas que el alta individual.
export const toCreateStudentDto = async ({
  values,
}: CsvRow): Promise<CsvRowResult> => {
  const plain: Record<string, string> = Object.fromEntries(
    Object.entries(values).map(([column, value]) => {
      const field = CSV_COLUMNS[column as CsvColumn];
      if (field === 'documentType') return [field, value.toUpperCase()];
      if (field === 'birthDate') return [field, normalizeDate(value)];
      return [field, value];
    }),
  );

  const dto = plainToInstance(CreateStudentDto, plain);
  const errors = await validate(dto);

  if (!errors.length) return { ok: true, dto };

  return {
    ok: false,
    messages: errors.map(({ property, constraints }) =>
      errorMessage(COLUMN_OF[property], plain[property], constraints),
    ),
  };
};
