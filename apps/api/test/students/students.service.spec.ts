import 'reflect-metadata';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import StudentDocumentTypeEnum from '@common/enums/student-document-type.enum';
import StudentStatusEnum from '@common/enums/student-status.enum';
import StudentsService from '../../src/students/students.service';
import StudentRepository from '../../src/students/student.repository';
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
  };
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
    };
    service = new StudentsService(repository as unknown as StudentRepository);
  });

  describe('listStudents', () => {
    const list = (overrides: Partial<ListStudentsDto> = {}) =>
      Object.assign(new ListStudentsDto(), overrides);

    it('lists only the actor organization, ordered by name and without the PIN', async () => {
      const pagination = list();

      await service.listStudents(actor, pagination);

      expect(repository.findAllPaginated).toHaveBeenCalledWith(
        pagination,
        { organizationId: 'org-id' },
        {
          attributes: { exclude: ['accessPin'] },
          order: [
            ['lastName', 'ASC'],
            ['firstName', 'ASC'],
          ],
        },
      );
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
      repository.findOne.mockResolvedValue({ id: 'student-id' });

      await service.findStudent(actor, 'student-id');

      expect(repository.findOne).toHaveBeenCalledWith(
        { id: 'student-id', organizationId: 'org-id' },
        true,
        { attributes: { exclude: ['accessPin'] } },
      );
    });
  });

  describe('createStudent', () => {
    it('creates the student in the actor organization without returning the PIN', async () => {
      const result = await service.createStudent(actor, {
        ...dto,
        studentCode: 'EST-01',
      });

      expect(repository.create).toHaveBeenCalledWith(
        { ...dto, studentCode: 'EST-01', organizationId: 'org-id' },
        undefined,
      );
      expect(result).not.toHaveProperty('accessPin');
    });

    it('uses the document number as code when none is given', async () => {
      await service.createStudent(actor, dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ studentCode: '1020' }),
        undefined,
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
    it('updates a student of the organization without returning the PIN', async () => {
      repository.findOne.mockImplementation((query: { id?: string }) =>
        Promise.resolve(
          query.id === 'student-id' ? { id: 'student-id' } : null,
        ),
      );

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
      });
    });

    it('checks the new document against the other students', async () => {
      repository.findOne
        .mockResolvedValueOnce({ id: 'student-id' })
        .mockResolvedValueOnce(null);

      await service.updateStudent(actor, 'student-id', {
        documentNumber: '3040',
      });

      expect(repository.findOne).toHaveBeenLastCalledWith(
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
});
