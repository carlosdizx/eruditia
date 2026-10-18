import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import {
  parseStudentsCsv,
  toCreateStudentDto,
} from '../../../src/students/utils/students-csv.util';
import { CSV_MAX_ROWS } from '../../../src/students/constants/students-import.constant';

const HEADER =
  'documento,tipo_documento,nombres,apellidos,fecha_nacimiento,nombre_acudiente,telefono_acudiente,correo_acudiente';

const csv = (...lines: string[]) => Buffer.from(lines.join('\n'));

describe('parseStudentsCsv', () => {
  it('maps each row to the template columns with its file line', () => {
    expect(
      parseStudentsCsv(
        csv(
          HEADER,
          '1020,TI,Sofía,Pérez,2015-03-01,Marta Gómez,3001234567,marta@example.com',
          '',
          '3040,RC,Juan,Díaz,,,,',
        ),
      ),
    ).toEqual([
      {
        line: 2,
        values: {
          documento: '1020',
          tipo_documento: 'TI',
          nombres: 'Sofía',
          apellidos: 'Pérez',
          fecha_nacimiento: '2015-03-01',
          nombre_acudiente: 'Marta Gómez',
          telefono_acudiente: '3001234567',
          correo_acudiente: 'marta@example.com',
        },
      },
      {
        line: 4,
        values: {
          documento: '3040',
          tipo_documento: 'RC',
          nombres: 'Juan',
          apellidos: 'Díaz',
        },
      },
    ]);
  });

  it('accepts the BOM, ";" as delimiter, extra spaces and header case', () => {
    expect(
      parseStudentsCsv(
        Buffer.from(
          '﻿ Documento ;TIPO_DOCUMENTO;nombres;apellidos\n 1020 ; ti ;Ana;Ruiz',
        ),
      ),
    ).toEqual([
      {
        line: 2,
        values: {
          documento: '1020',
          tipo_documento: 'ti',
          nombres: 'Ana',
          apellidos: 'Ruiz',
        },
      },
    ]);
  });

  it('rejects a file without the required columns', () => {
    expect(() => parseStudentsCsv(csv('documento,nombres', '1,Ana'))).toThrow(
      'Faltan columnas obligatorias: tipo_documento, apellidos',
    );
  });

  it('rejects an empty file', () => {
    expect(() => parseStudentsCsv(csv(HEADER))).toThrow(BadRequestException);
  });

  it('rejects a malformed CSV', () => {
    expect(() => parseStudentsCsv(csv(HEADER, '1020,TI,"Sofía,Pérez'))).toThrow(
      BadRequestException,
    );
  });

  it(`rejects more than ${CSV_MAX_ROWS} rows`, () => {
    const rows = Array.from(
      { length: CSV_MAX_ROWS + 1 },
      (_, i) => `${i},TI,Ana,Ruiz`,
    );

    expect(() => parseStudentsCsv(csv(HEADER, ...rows))).toThrow(
      BadRequestException,
    );
  });
});

describe('toCreateStudentDto', () => {
  const row = (values: Record<string, string>) => ({
    line: 2,
    values: {
      documento: '1020',
      tipo_documento: 'TI',
      nombres: 'Sofía',
      apellidos: 'Pérez',
      ...values,
    },
  });

  it('builds the DTO normalizing the document type and a DD/MM/YYYY date', async () => {
    await expect(
      toCreateStudentDto(
        row({ tipo_documento: 'rc', fecha_nacimiento: '1/3/2015' }),
      ),
    ).resolves.toEqual({
      ok: true,
      dto: expect.objectContaining({
        documentNumber: '1020',
        documentType: 'RC',
        firstName: 'Sofía',
        lastName: 'Pérez',
        birthDate: '2015-03-01',
      }),
    });
  });

  it('reports every invalid column by its CSV name', async () => {
    const { tipo_documento: _type, ...withoutType } = row({
      fecha_nacimiento: '2015-02-30',
      correo_acudiente: 'no-es-correo',
    }).values;

    const result = await toCreateStudentDto({ line: 2, values: withoutType });

    expect(result).toEqual({
      ok: false,
      messages: [
        'tipo_documento es obligatorio',
        expect.stringMatching(/^fecha_nacimiento: La fecha de nacimiento/),
        'correo_acudiente no es válido ("no-es-correo")',
      ],
    });
  });
});
