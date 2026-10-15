import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import CreateStudentDto from '../../../src/students/dto/create-student.dto';
import UpdateStudentDto from '../../../src/students/dto/update-student.dto';
import ListStudentsDto from '../../../src/students/dto/list-students.dto';

const errorsOf = async <T extends object>(
  cls: new () => T,
  plain: Record<string, unknown>,
) =>
  (await validate(plainToInstance(cls, plain))).map(({ property }) => property);

describe('CreateStudentDto', () => {
  const valid = {
    firstName: 'Sofía',
    lastName: 'Pérez',
    documentType: 'RC',
    documentNumber: '1020304050',
  };

  it('accepts a student without email, code or guardian', async () => {
    await expect(errorsOf(CreateStudentDto, valid)).resolves.toEqual([]);
  });

  it('requires a valid email only when creating an account', async () => {
    await expect(
      errorsOf(CreateStudentDto, { ...valid, email: 'ignored' }),
    ).resolves.toEqual([]);
    await expect(
      errorsOf(CreateStudentDto, { ...valid, createAccount: true }),
    ).resolves.toEqual(['email']);
    await expect(
      errorsOf(CreateStudentDto, {
        ...valid,
        createAccount: true,
        email: 'sofia@example.com',
      }),
    ).resolves.toEqual([]);
  });

  it('accepts the full record', async () => {
    await expect(
      errorsOf(CreateStudentDto, {
        ...valid,
        studentCode: 'EST-2026-01',
        birthDate: '2018-05-20',
        guardianName: 'Marta Gómez',
        guardianPhone: '+57 300 123 4567',
        guardianEmail: 'marta@example.com',
        status: 'active',
      }),
    ).resolves.toEqual([]);
  });

  it('requires names, document type and number', async () => {
    await expect(errorsOf(CreateStudentDto, {})).resolves.toEqual([
      'firstName',
      'lastName',
      'documentType',
      'documentNumber',
    ]);
  });

  it('rejects malformed optional fields', async () => {
    await expect(
      errorsOf(CreateStudentDto, {
        ...valid,
        documentType: 'PASAPORTE',
        studentCode: 'con espacios',
        birthDate: '2018-02-30T00:00',
        guardianPhone: 'abc',
        guardianEmail: 'no-es-correo',
        status: 'retirado',
      }),
    ).resolves.toEqual([
      'documentType',
      'studentCode',
      'birthDate',
      'guardianPhone',
      'guardianEmail',
      'status',
    ]);
  });
});

describe('UpdateStudentDto', () => {
  it('accepts a status change alone', async () => {
    await expect(
      errorsOf(UpdateStudentDto, { status: 'graduated' }),
    ).resolves.toEqual([]);
  });

  it('accepts null to clear optional fields', async () => {
    await expect(
      errorsOf(UpdateStudentDto, {
        birthDate: null,
        guardianName: null,
        guardianPhone: null,
        guardianEmail: null,
      }),
    ).resolves.toEqual([]);
  });
});

describe('ListStudentsDto', () => {
  it('accepts a status filter and rejects an unknown one', async () => {
    await expect(
      errorsOf(ListStudentsDto, { status: 'suspended' }),
    ).resolves.toEqual([]);
    await expect(errorsOf(ListStudentsDto, { status: 'x' })).resolves.toEqual([
      'status',
    ]);
  });
});
