import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import GradeLevelsService from '../../src/grade-levels/grade-levels.service';
import GradeLevelRepository from '../../src/grade-levels/grade-level.repository';
import ClassroomRepository from '../../src/classrooms/classroom.repository';
import { GRADE_LEVEL_HAS_CLASSROOMS_MESSAGE } from '../../src/classrooms/constants/classroom-messages.constant';
import STANDARD_GRADE_LEVELS from '../../src/grade-levels/constants/standard-grade-levels.constant';
import { GRADE_LEVEL_NAME_IN_USE_MESSAGE } from '../../src/grade-levels/constants/grade-level-messages.constant';

describe('GradeLevelsService', () => {
  let repository: {
    findOne: jest.Mock;
    findAll: jest.Mock;
    create: jest.Mock;
    insertMany: jest.Mock;
    updateByPk: jest.Mock;
    deleteByPk: jest.Mock;
    transaction: jest.Mock;
  };
  let classroomRepository: { findOne: jest.Mock };
  let service: GradeLevelsService;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const actor = { organizationId: 'org-id' };
  const first = { name: 'Primero', shortName: '1°', sequenceOrder: 1 };

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn((data: object) =>
        Promise.resolve({ id: 'grade-id', ...data }),
      ),
      insertMany: jest.fn().mockResolvedValue([]),
      updateByPk: jest.fn((id: string, data: object) =>
        Promise.resolve({ id, ...data }),
      ),
      deleteByPk: jest.fn().mockResolvedValue({}),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    classroomRepository = { findOne: jest.fn().mockResolvedValue(null) };
    service = new GradeLevelsService(
      repository as unknown as GradeLevelRepository,
      classroomRepository as unknown as ClassroomRepository,
    );
  });

  it('lists the organization grades in promotion order', async () => {
    await service.listGradeLevels(actor);

    expect(repository.findAll).toHaveBeenCalledWith(
      { organizationId: 'org-id' },
      { order: [['sequenceOrder', 'ASC']] },
    );
  });

  it('rejects an actor without organization', async () => {
    await expect(
      service.listGradeLevels({ organizationId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('createGradeLevel', () => {
    it('creates the grade in the organization after checking name and order', async () => {
      await expect(service.createGradeLevel(actor, first)).resolves.toEqual({
        id: 'grade-id',
        ...first,
        organizationId: 'org-id',
      });
      expect(repository.findOne).toHaveBeenCalledWith(
        {
          organizationId: 'org-id',
          [Op.or]: [{ name: 'Primero' }, { sequenceOrder: 1 }],
        },
        false,
        { attributes: ['id', 'name', 'sequenceOrder'] },
      );
    });

    it('rejects a repeated name', async () => {
      repository.findOne.mockResolvedValue({
        name: 'Primero',
        sequenceOrder: 9,
      });

      await expect(service.createGradeLevel(actor, first)).rejects.toThrow(
        GRADE_LEVEL_NAME_IN_USE_MESSAGE,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a repeated order naming the grade that has it', async () => {
      repository.findOne.mockResolvedValue({ name: 'Uno', sequenceOrder: 1 });

      await expect(service.createGradeLevel(actor, first)).rejects.toThrow(
        'Ese orden ya lo tiene el grado Uno',
      );
    });
  });

  describe('updateGradeLevel', () => {
    it('checks the new order against the other grades of the organization', async () => {
      repository.findOne.mockImplementation((query: { id?: unknown }) =>
        Promise.resolve(
          typeof query.id === 'string' ? { id: 'grade-id' } : null,
        ),
      );

      await service.updateGradeLevel(actor, 'grade-id', { sequenceOrder: 2 });

      expect(repository.findOne).toHaveBeenCalledWith(
        { id: 'grade-id', organizationId: 'org-id' },
        true,
        { attributes: ['id'] },
      );
      expect(repository.findOne).toHaveBeenCalledWith(
        {
          organizationId: 'org-id',
          [Op.or]: [{ sequenceOrder: 2 }],
          id: { [Op.ne]: 'grade-id' },
        },
        false,
        { attributes: ['id', 'name', 'sequenceOrder'] },
      );
      expect(repository.updateByPk).toHaveBeenCalledWith(
        'grade-id',
        { sequenceOrder: 2 },
        undefined,
      );
    });

    it('returns 404 for a grade of another organization', async () => {
      repository.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.updateGradeLevel(actor, 'grade-id', { name: 'Uno' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.updateByPk).not.toHaveBeenCalled();
    });
  });

  it('deletes a grade of the organization', async () => {
    repository.findOne.mockResolvedValue({ id: 'grade-id' });

    await service.deleteGradeLevel(actor, 'grade-id');

    expect(repository.findOne).toHaveBeenCalledWith(
      { id: 'grade-id', organizationId: 'org-id' },
      true,
      { attributes: ['id'] },
    );
    expect(classroomRepository.findOne).toHaveBeenCalledWith(
      { gradeLevelId: 'grade-id' },
      false,
      { attributes: ['id'] },
    );
    expect(repository.deleteByPk).toHaveBeenCalledWith('grade-id', undefined);
  });

  it('does not delete a grade with classrooms', async () => {
    repository.findOne.mockResolvedValue({ id: 'grade-id' });
    classroomRepository.findOne.mockResolvedValue({ id: 'classroom-id' });

    await expect(service.deleteGradeLevel(actor, 'grade-id')).rejects.toThrow(
      GRADE_LEVEL_HAS_CLASSROOMS_MESSAGE,
    );
    expect(repository.deleteByPk).not.toHaveBeenCalled();
  });

  describe('loadStandardGradeLevels', () => {
    it('creates Transición to Once, with Once as final grade', async () => {
      await expect(service.loadStandardGradeLevels(actor)).resolves.toEqual({
        created: 12,
        skipped: 0,
      });

      const created = repository.insertMany.mock.calls[0][0] as {
        sequenceOrder: number;
        isFinalGrade?: boolean;
        organizationId: string;
      }[];
      expect(created.map(({ sequenceOrder }) => sequenceOrder)).toEqual([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
      ]);
      expect(created.filter(({ isFinalGrade }) => isFinalGrade)).toEqual([
        expect.objectContaining({ name: 'Once', sequenceOrder: 11 }),
      ]);
      expect(
        created.every(({ organizationId }) => organizationId === 'org-id'),
      ).toBe(true);
      expect(repository.insertMany.mock.calls[0][1]).toEqual({ transaction });
    });

    it('skips the grades whose name or order already exist', async () => {
      repository.findAll.mockResolvedValue([
        { name: 'primero', sequenceOrder: 50 },
        { name: 'Grado dos', sequenceOrder: 2 },
      ]);

      await expect(service.loadStandardGradeLevels(actor)).resolves.toEqual({
        created: STANDARD_GRADE_LEVELS.length - 2,
        skipped: 2,
      });
      const names = (
        repository.insertMany.mock.calls[0][0] as { name: string }[]
      ).map(({ name }) => name);
      expect(names).not.toContain('Primero');
      expect(names).not.toContain('Segundo');
    });

    it('does nothing when the catalog is complete', async () => {
      repository.findAll.mockResolvedValue(STANDARD_GRADE_LEVELS);

      await expect(service.loadStandardGradeLevels(actor)).resolves.toEqual({
        created: 0,
        skipped: 12,
      });
      expect(repository.insertMany).not.toHaveBeenCalled();
    });
  });
});
