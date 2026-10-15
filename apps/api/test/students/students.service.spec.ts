jest.mock('../../src/students/utils/access-pin.util', () => ({
  generateAccessPin: jest.fn(),
}));

import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import StudentDocumentTypeEnum from '@common/enums/student-document-type.enum';
import StudentStatusEnum from '@common/enums/student-status.enum';
import StudentsService from '../../src/students/students.service';
import StudentRepository from '../../src/students/student.repository';
import StudentAccessService from '../../src/students/student-access.service';
import { generateAccessPin } from '../../src/students/utils/access-pin.util';
import { STUDENT_USER_INCLUDE } from '../../src/students/utils/public-student.util';
import CreateStudentDto from '../../src/students/dto/create-student.dto';
import ListStudentsDto from '../../src/students/dto/list-students.dto';
import {
  DOCUMENT_IN_USE_MESSAGE,
  STUDENT_CODE_IN_USE_MESSAGE,
} from '../../src/students/constants/student-messages.constant';

describe('StudentsService', () => {
  let repository: {
    findOne: jest.Mock;
    findAllPaginated: jest.Mock;
    create: jest.Mock;
    updateByPk: jest.Mock;
    findAll: jest.Mock;
    insertMany: jest.Mock;
    transaction: jest.Mock;
  };
  const transaction = { id: 'tx' } as unknown as Transaction;
  let studentAccessService: { provideAccount: jest.Mock };
  let service: StudentsService;

  const actor = { organizationId: 'org-id' };
  const noOrganization = { organizationId: null };

  const dto: CreateStudentDto = {
    firstName: 'Sofía',
    lastName: 'Pérez',
    documentType: StudentDocumentTypeEnum.TI,
    documentNumber: '1020',
  };

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue(null),
      findAllPaginated: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      create: jest.fn((data: object) =>
        Promise.resolve({ id: 'student-id', ...data, accessPin: 'hash' }),
      ),
      updateByPk: jest.fn((id: string, data: object) =>
        Promise.resolve({ id, ...data, accessPin: 'hash' }),
      ),
      findAll: jest.fn().mockResolvedValue([]),
      insertMany: jest.fn().mockResolvedValue([]),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    studentAccessService = {
      provideAccount: jest
        .fn()
        .mockResolvedValue({ id: 'user-id', email: 'sofia@example.com' }),
    };
    jest
      .mocked(generateAccessPin)
      .mockReset()
      .mockResolvedValue({ accessPin: '012345', accessPinHash: 'pin-hash' });

    service = new StudentsService(
      repository as unknown as StudentRepository,
      studentAccessService as unknown as StudentAccessService,
    );
  });

  describe('listStudents', () => {
    const list = (overrides: Partial<ListStudentsDto> = {}) =>
      Object.assign(new ListStudentsDto(), overrides);

    it('lists only the actor organization, ordered by name, with the linked account', async () => {
      const pagination = list();

      await service.listStudents(actor, pagination);

      expect(repository.findAllPaginated).toHaveBeenCalledWith(
        pagination,
        { organizationId: 'org-id' },
        {
          include: STUDENT_USER_INCLUDE,
          order: [
            ['lastName', 'ASC'],
            ['firstName', 'ASC'],
          ],
        },
      );
    });

    it('replaces the PIN hash by whether the student has one', async () => {
      repository.findAllPaginated.mockResolvedValue({
        data: [
          { id: 'a', accessPin: 'hash' },
          { id: 'b', accessPin: null },
        ],
        meta: { total: 2 },
      });

      await expect(service.listStudents(actor, list())).resolves.toEqual({
        data: [
          { id: 'a', hasAccessPin: true },
          { id: 'b', hasAccessPin: false },
        ],
        meta: { total: 2 },
      });
    });

    it('filters by status', async () => {
      await service.listStudents(
        actor,
        list({ status: StudentStatusEnum.WITHDRAWN }),
      );

      expect(repository.findAllPaginated.mock.calls[0][1]).toEqual({
        organizationId: 'org-id',
        status: StudentStatusEnum.WITHDRAWN,
      });
    });

    it('matches every search word against name, document or code', async () => {
      await service.listStudents(actor, list({ search: '  ana 10%_ ' }));

      const fieldsMatching = (pattern: string) => ({
        [Op.or]: ['firstName', 'lastName', 'documentNumber', 'studentCode'].map(
          (field) => ({ [field]: { [Op.iLike]: pattern } }),
        ),
      });

      expect(repository.findAllPaginated.mock.calls[0][1]).toEqual({
        organizationId: 'org-id',
        [Op.and]: [fieldsMatching('%ana%'), fieldsMatching('%10\\%\\_%')],
      });
    });

    it('rejects an actor without organization', async () => {
      await expect(
        service.listStudents(noOrganization, list()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findStudent', () => {
    it('looks the student up only inside the actor organization', async () => {
      repository.findOne.mockResolvedValue({
        id: 'student-id',
        accessPin: 'hash',
      });

      await expect(service.findStudent(actor, 'student-id')).resolves.toEqual({
        id: 'student-id',
        hasAccessPin: true,
      });
      expect(repository.findOne).toHaveBeenCalledWith(
        { id: 'student-id', organizationId: 'org-id' },
        true,
        { include: STUDENT_USER_INCLUDE },
      );
    });
  });

  describe('createStudent', () => {
    it('creates the student with a hashed PIN and returns the plain PIN once', async () => {
      repository.create.mockImplementation((data: object) =>
        Promise.resolve({ id: 'student-id', ...data }),
      );

      const result = await service.createStudent(actor, {
        ...dto,
        studentCode: 'EST-01',
      });

      expect(repository.create).toHaveBeenCalledWith(
        {
          ...dto,
          studentCode: 'EST-01',
          organizationId: 'org-id',
          userId: null,
          accessPin: 'pin-hash',
        },
        { transaction },
      );
      expect(studentAccessService.provideAccount).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'student-id',
        hasAccessPin: true,
        accessPin: '012345',
        user: null,
      });
    });

    it('creates or links an account instead of a PIN when requested', async () => {
      repository.create.mockImplementation((data: object) =>
        Promise.resolve({ id: 'student-id', ...data }),
      );

      const result = await service.createStudent(actor, {
        ...dto,
        createAccount: true,
        email: 'sofia@example.com',
      });

      expect(studentAccessService.provideAccount).toHaveBeenCalledWith(
        'org-id',
        'sofia@example.com',
        { ...dto },
        transaction,
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-id', accessPin: null }),
        { transaction },
      );
      expect(repository.create.mock.calls[0][0]).not.toHaveProperty('email');
      expect(generateAccessPin).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        hasAccessPin: false,
        accessPin: null,
        user: { id: 'user-id', email: 'sofia@example.com', isActive: true },
      });
    });

    it('uses the document number as code when none is given', async () => {
      await service.createStudent(actor, dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ studentCode: '1020' }),
        { transaction },
      );
    });

    it('checks document and code uniqueness inside the organization', async () => {
      await service.createStudent(actor, { ...dto, studentCode: 'EST-01' });

      expect(repository.findOne).toHaveBeenCalledWith(
        {
          organizationId: 'org-id',
          [Op.or]: [{ documentNumber: '1020' }, { studentCode: 'EST-01' }],
        },
        false,
        { attributes: ['id', 'documentNumber', 'studentCode'] },
      );
    });

    it.each([
      [DOCUMENT_IN_USE_MESSAGE, { documentNumber: '1020', studentCode: 'X' }],
      [
        STUDENT_CODE_IN_USE_MESSAGE,
        { documentNumber: '9', studentCode: 'EST-01' },
      ],
    ])('rejects a duplicate: %s', async (message, existing) => {
      repository.findOne.mockResolvedValue({ id: 'other-id', ...existing });

      const promise = service.createStudent(actor, {
        ...dto,
        studentCode: 'EST-01',
      });

      await expect(promise).rejects.toBeInstanceOf(ConflictException);
      await expect(promise).rejects.toThrow(message);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects an actor without organization', async () => {
      await expect(
        service.createStudent(noOrganization, dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateStudent', () => {
    // Responde al estudiante objetivo y deja libres documento y código.
    const mockStudent = () =>
      repository.findOne.mockImplementation((query: { id?: string }) =>
        Promise.resolve(
          query.id === 'student-id'
            ? { id: 'student-id', status: 'graduated', accessPin: 'hash' }
            : null,
        ),
      );

    it('updates a student of the organization and returns it without the PIN', async () => {
      mockStudent();

      const result = await service.updateStudent(actor, 'student-id', {
        status: StudentStatusEnum.GRADUATED,
      });

      expect(repository.findOne).toHaveBeenCalledWith(
        { id: 'student-id', organizationId: 'org-id' },
        true,
        { attributes: ['id'] },
      );
      expect(repository.updateByPk).toHaveBeenCalledWith(
        'student-id',
        { status: StudentStatusEnum.GRADUATED },
        undefined,
      );
      expect(result).toEqual({
        id: 'student-id',
        status: StudentStatusEnum.GRADUATED,
        hasAccessPin: true,
      });
    });

    it('checks the new document against the other students', async () => {
      mockStudent();

      await service.updateStudent(actor, 'student-id', {
        documentNumber: '3040',
      });

      expect(repository.findOne).toHaveBeenNthCalledWith(
        2,
        {
          organizationId: 'org-id',
          [Op.or]: [{ documentNumber: '3040' }],
          id: { [Op.ne]: 'student-id' },
        },
        false,
        { attributes: ['id', 'documentNumber', 'studentCode'] },
      );
    });

    it('returns 404 for a student of another organization', async () => {
      repository.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.updateStudent(actor, 'student-id', { firstName: 'Eva' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.updateByPk).not.toHaveBeenCalled();
    });
  });

  describe('importStudents', () => {
    const csv = (...rows: string[]) =>
      Buffer.from(
        ['documento;tipo_documento;nombres;apellidos', ...rows].join('\n'),
      );

    it('creates the valid rows in the organization using the document as code', async () => {
      const summary = await service.importStudents(
        actor,
        csv('1020;TI;Sofía;Pérez', '3040;rc;Juan;Díaz'),
      );

      expect(repository.insertMany).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            documentNumber: '1020',
            documentType: 'TI',
            studentCode: '1020',
            organizationId: 'org-id',
          }),
          expect.objectContaining({
            documentNumber: '3040',
            documentType: 'RC',
            studentCode: '3040',
            organizationId: 'org-id',
          }),
        ],
        { transaction },
      );
      expect(summary).toEqual({ total: 2, created: 2, failed: 0, errors: [] });
    });

    it('looks for existing documents or codes only inside the organization', async () => {
      await service.importStudents(actor, csv('1020;TI;Sofía;Pérez'));

      expect(repository.findAll).toHaveBeenCalledWith(
        {
          organizationId: 'org-id',
          [Op.or]: [{ documentNumber: ['1020'] }, { studentCode: ['1020'] }],
        },
        { attributes: ['documentNumber', 'studentCode'] },
      );
    });

    it('reports invalid, repeated and already registered rows and imports the rest', async () => {
      repository.findAll.mockResolvedValue([
        { documentNumber: '5060', studentCode: 'X' },
        { documentNumber: '9', studentCode: '7080' },
      ]);

      const summary = await service.importStudents(
        actor,
        csv(
          '1020;TI;Sofía;Pérez',
          '1020;TI;Sofía;Repetida',
          '5060;TI;Ya;Existe',
          '7080;TI;Código;Usado',
          '9999;PASAPORTE;Mal;Tipo',
        ),
      );

      expect(repository.insertMany).toHaveBeenCalledWith(
        [expect.objectContaining({ documentNumber: '1020' })],
        { transaction },
      );
      expect(summary).toEqual({
        total: 5,
        created: 1,
        failed: 4,
        errors: [
          {
            line: 3,
            documentNumber: '1020',
            messages: ['documento repetido en el archivo (línea 2)'],
          },
          {
            line: 4,
            documentNumber: '5060',
            messages: [DOCUMENT_IN_USE_MESSAGE],
          },
          {
            line: 5,
            documentNumber: '7080',
            messages: [STUDENT_CODE_IN_USE_MESSAGE],
          },
          {
            line: 6,
            documentNumber: '9999',
            messages: ['tipo_documento no es válido ("PASAPORTE")'],
          },
        ],
      });
    });

    it('does not write anything when no row is valid', async () => {
      const summary = await service.importStudents(
        actor,
        csv('1020;XX;Sofía;Pérez'),
      );

      expect(repository.findAll).not.toHaveBeenCalled();
      expect(repository.insertMany).not.toHaveBeenCalled();
      expect(summary).toMatchObject({ total: 1, created: 0, failed: 1 });
    });

    it('rejects a file that is not a valid CSV', async () => {
      await expect(
        service.importStudents(actor, Buffer.from('nombre\nAna')),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an actor without organization', async () => {
      await expect(
        service.importStudents(noOrganization, csv('1020;TI;Sofía;Pérez')),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
