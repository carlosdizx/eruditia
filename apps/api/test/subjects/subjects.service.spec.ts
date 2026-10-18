import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Op, Transaction } from 'sequelize';
import SubjectsService from '../../src/subjects/subjects.service';
import SubjectRepository from '../../src/subjects/subject.repository';
import ClassroomSubjectRepository from '../../src/classroom-subjects/classroom-subject.repository';
import CreateSubjectDto from '../../src/subjects/dto/create-subject.dto';
import STANDARD_SUBJECTS from '../../src/subjects/constants/standard-subjects.constant';
import {
  SUBJECT_CODE_IN_USE_MESSAGE,
  SUBJECT_HAS_CLASSROOMS_MESSAGE,
  SUBJECT_NAME_IN_USE_MESSAGE,
} from '../../src/subjects/constants/subject-messages.constant';

describe('SubjectsService', () => {
  let repository: {
    findOne: jest.Mock;
    findAll: jest.Mock;
    create: jest.Mock;
    insertMany: jest.Mock;
    updateByPk: jest.Mock;
    deleteByPk: jest.Mock;
    transaction: jest.Mock;
  };
  let classroomSubjectRepository: { findOne: jest.Mock };
  let service: SubjectsService;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const actor = { organizationId: 'org-id' };
  const math = { name: 'Matemáticas', code: 'MAT', areaName: 'Matemáticas' };

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn((data: object) =>
        Promise.resolve({ id: 'subject-id', ...data }),
      ),
      insertMany: jest.fn().mockResolvedValue([]),
      updateByPk: jest.fn().mockResolvedValue({}),
      deleteByPk: jest.fn().mockResolvedValue({}),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    classroomSubjectRepository = { findOne: jest.fn().mockResolvedValue(null) };
    service = new SubjectsService(
      repository as unknown as SubjectRepository,
      classroomSubjectRepository as unknown as ClassroomSubjectRepository,
    );
  });

  it('lists the organization subjects by name', async () => {
    await service.listSubjects(actor);

    expect(repository.findAll).toHaveBeenCalledWith(
      { organizationId: 'org-id' },
      { order: [['name', 'ASC']] },
    );
  });

  describe('createSubject', () => {
    it('creates the subject after checking name and code', async () => {
      await service.createSubject(actor, math);

      expect(repository.findOne).toHaveBeenCalledWith(
        {
          organizationId: 'org-id',
          [Op.or]: [{ name: 'Matemáticas' }, { code: 'MAT' }],
        },
        false,
        { attributes: ['id', 'name', 'code'] },
      );
      expect(repository.create).toHaveBeenCalledWith(
        { ...math, organizationId: 'org-id' },
        undefined,
      );
    });

    it.each([
      [SUBJECT_NAME_IN_USE_MESSAGE, { name: 'Matemáticas', code: 'X' }],
      [SUBJECT_CODE_IN_USE_MESSAGE, { name: 'Otra', code: 'MAT' }],
    ])('rejects a duplicate: %s', async (message, existing) => {
      repository.findOne.mockResolvedValue(existing);

      await expect(service.createSubject(actor, math)).rejects.toThrow(message);
    });
  });

  it('updates a subject checking the others of the organization', async () => {
    repository.findOne.mockImplementation((query: { id?: unknown }) =>
      Promise.resolve(
        typeof query.id === 'string' ? { id: 'subject-id' } : null,
      ),
    );

    await service.updateSubject(actor, 'subject-id', { code: 'MATE' });

    expect(repository.findOne).toHaveBeenCalledWith(
      {
        organizationId: 'org-id',
        [Op.or]: [{ code: 'MATE' }],
        id: { [Op.ne]: 'subject-id' },
      },
      false,
      { attributes: ['id', 'name', 'code'] },
    );
    expect(repository.updateByPk).toHaveBeenCalledWith(
      'subject-id',
      { code: 'MATE' },
      undefined,
    );
  });

  describe('deleteSubject', () => {
    it('deletes a subject not assigned to classrooms', async () => {
      repository.findOne.mockResolvedValue({ id: 'subject-id' });

      await service.deleteSubject(actor, 'subject-id');

      expect(classroomSubjectRepository.findOne).toHaveBeenCalledWith(
        { subjectId: 'subject-id' },
        false,
        { attributes: ['id'] },
      );
      expect(repository.deleteByPk).toHaveBeenCalledWith(
        'subject-id',
        undefined,
      );
    });

    it('does not delete a subject assigned to classrooms', async () => {
      repository.findOne.mockResolvedValue({ id: 'subject-id' });
      classroomSubjectRepository.findOne.mockResolvedValue({ id: 'a-id' });

      await expect(service.deleteSubject(actor, 'subject-id')).rejects.toThrow(
        SUBJECT_HAS_CLASSROOMS_MESSAGE,
      );
      expect(repository.deleteByPk).not.toHaveBeenCalled();
    });

    it('returns 404 for a subject of another organization', async () => {
      repository.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.deleteSubject(actor, 'subject-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('loadStandardSubjects', () => {
    it('creates every base subject for an empty catalog', async () => {
      await expect(service.loadStandardSubjects(actor)).resolves.toEqual({
        created: STANDARD_SUBJECTS.length,
        skipped: 0,
      });
      expect(repository.insertMany).toHaveBeenCalledWith(
        STANDARD_SUBJECTS.map((subject) => ({
          ...subject,
          organizationId: 'org-id',
        })),
        { transaction },
      );
    });

    it('skips the subjects whose name or code already exist', async () => {
      repository.findAll.mockResolvedValue([
        { name: 'matemáticas', code: 'M1' },
        { name: 'English', code: 'ING' },
      ]);

      await expect(service.loadStandardSubjects(actor)).resolves.toEqual({
        created: STANDARD_SUBJECTS.length - 2,
        skipped: 2,
      });
    });
  });
});

describe('CreateSubjectDto', () => {
  it('uppercases the code and rejects spaces', async () => {
    const dto = plainToInstance(CreateSubjectDto, {
      name: 'Matemáticas',
      code: ' mat ',
    });
    expect(dto.code).toBe('MAT');
    await expect(validate(dto)).resolves.toEqual([]);

    const errors = await validate(
      plainToInstance(CreateSubjectDto, { name: 'X', code: 'MA T' }),
    );
    expect(errors.map(({ property }) => property)).toEqual(['code']);
  });
});
