import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import ClassroomSubjectsService, {
  ASSIGNMENT_INCLUDE,
} from '../../src/classroom-subjects/classroom-subjects.service';
import ClassroomSubjectRepository from '../../src/classroom-subjects/classroom-subject.repository';
import ClassroomsService from '../../src/classrooms/classrooms.service';
import AcademicYearsService from '../../src/academic-years/academic-years.service';
import SubjectsService from '../../src/subjects/subjects.service';
import UsersService from '../../src/users/users.service';
import { CLOSED_YEAR_CLASSROOMS_MESSAGE } from '../../src/classrooms/constants/classroom-messages.constant';
import {
  INVALID_SUBJECT_TEACHER_MESSAGE,
  SAME_YEAR_COPY_MESSAGE,
  SUBJECT_ALREADY_ASSIGNED_MESSAGE,
} from '../../src/classroom-subjects/constants/classroom-subject-messages.constant';

describe('ClassroomSubjectsService', () => {
  let repository: {
    findOne: jest.Mock;
    findAll: jest.Mock;
    create: jest.Mock;
    insertMany: jest.Mock;
    updateByPk: jest.Mock;
    deleteByPk: jest.Mock;
    transaction: jest.Mock;
  };
  let classroomsService: {
    findOne: jest.Mock;
    findAll: jest.Mock;
    create: jest.Mock;
  };
  let academicYearsService: { findOne: jest.Mock };
  let subjectsService: { findOne: jest.Mock };
  let usersService: { findOrganizationTeachers: jest.Mock };
  let service: ClassroomSubjectsService;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const actor = { organizationId: 'org-id', userId: 'teacher-id' };

  const classroom = (status = AcademicYearStatusEnum.OPEN) => ({
    id: 'classroom-id',
    academicYearId: 'year-id',
    academicYear: { id: 'year-id', status },
  });

  // findOne con id responde la asignación; sin id (repetida) no encuentra.
  const mockAssignment = () =>
    repository.findOne.mockImplementation((query: { id?: unknown }) =>
      Promise.resolve(
        typeof query.id === 'string'
          ? { id: query.id, teacherId: 'teacher-id' }
          : null,
      ),
    );

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn((data: object) =>
        Promise.resolve({ id: 'assignment-id', ...data }),
      ),
      insertMany: jest.fn().mockResolvedValue([]),
      updateByPk: jest.fn().mockResolvedValue({}),
      deleteByPk: jest.fn().mockResolvedValue({}),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    classroomsService = {
      findOne: jest.fn().mockResolvedValue(classroom()),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn((data: { name: string }) =>
        Promise.resolve({ id: `new-${data.name}`, ...data }),
      ),
    };
    academicYearsService = {
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: 'year-id',
          status: AcademicYearStatusEnum.OPEN,
        }),
    };
    subjectsService = { findOne: jest.fn().mockResolvedValue({ id: 's-id' }) };
    usersService = {
      findOrganizationTeachers: jest
        .fn()
        .mockResolvedValue([{ id: 'teacher-id' }]),
    };
    service = new ClassroomSubjectsService(
      repository as unknown as ClassroomSubjectRepository,
      classroomsService as unknown as ClassroomsService,
      academicYearsService as unknown as AcademicYearsService,
      subjectsService as unknown as SubjectsService,
      usersService as unknown as UsersService,
    );
  });

  describe('listClassroomSubjects', () => {
    it('lists the subjects of a classroom of the organization', async () => {
      await service.listClassroomSubjects(actor, 'classroom-id');

      expect(classroomsService.findOne).toHaveBeenCalledWith(
        { id: 'classroom-id', organizationId: 'org-id' },
        true,
        expect.objectContaining({ attributes: ['id', 'academicYearId'] }),
      );
      expect(repository.findAll).toHaveBeenCalledWith(
        { classroomId: 'classroom-id' },
        expect.objectContaining({ include: ASSIGNMENT_INCLUDE }),
      );
    });

    it('also lists the classrooms of a closed year', async () => {
      classroomsService.findOne.mockResolvedValue(
        classroom(AcademicYearStatusEnum.CLOSED),
      );

      await expect(
        service.listClassroomSubjects(actor, 'classroom-id'),
      ).resolves.toEqual([]);
    });
  });

  describe('assignSubject', () => {
    const dto = {
      subjectId: 's-id',
      teacherId: 'teacher-id',
      weeklyHours: 4,
      weightInGpa: 1.5,
    };

    it('validates subject and teacher and creates the assignment', async () => {
      mockAssignment();

      await service.assignSubject(actor, 'classroom-id', dto);

      expect(subjectsService.findOne).toHaveBeenCalledWith(
        { id: 's-id', organizationId: 'org-id' },
        true,
        { attributes: ['id'] },
      );
      expect(usersService.findOrganizationTeachers).toHaveBeenCalledWith(
        'org-id',
        ['teacher-id'],
      );
      expect(repository.findOne).toHaveBeenCalledWith(
        { classroomId: 'classroom-id', subjectId: 's-id' },
        false,
        { attributes: ['id'] },
      );
      expect(repository.create).toHaveBeenCalledWith(
        { ...dto, classroomId: 'classroom-id', organizationId: 'org-id' },
        undefined,
      );
    });

    it('rejects a subject already assigned to the classroom', async () => {
      repository.findOne.mockResolvedValue({ id: 'other-id' });

      await expect(
        service.assignSubject(actor, 'classroom-id', dto),
      ).rejects.toThrow(SUBJECT_ALREADY_ASSIGNED_MESSAGE);
    });

    it('rejects a teacher that is not an active teacher of the organization', async () => {
      usersService.findOrganizationTeachers.mockResolvedValue([]);

      await expect(
        service.assignSubject(actor, 'classroom-id', dto),
      ).rejects.toThrow(INVALID_SUBJECT_TEACHER_MESSAGE);
    });

    it('rejects a classroom of a closed year', async () => {
      classroomsService.findOne.mockResolvedValue(
        classroom(AcademicYearStatusEnum.CLOSED),
      );

      await expect(
        service.assignSubject(actor, 'classroom-id', dto),
      ).rejects.toThrow(CLOSED_YEAR_CLASSROOMS_MESSAGE);
    });

    it('rejects a subject of another organization', async () => {
      subjectsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.assignSubject(actor, 'classroom-id', dto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateClassroomSubject', () => {
    it('keeps the current teacher without revalidating it', async () => {
      mockAssignment();
      usersService.findOrganizationTeachers.mockResolvedValue([]);

      await service.updateClassroomSubject(actor, 'classroom-id', 'a-id', {
        teacherId: 'teacher-id',
        weeklyHours: null,
      });

      expect(usersService.findOrganizationTeachers).not.toHaveBeenCalled();
      expect(repository.findOne).toHaveBeenCalledWith(
        { id: 'a-id', classroomId: 'classroom-id' },
        true,
        { attributes: ['id', 'teacherId'] },
      );
      expect(repository.updateByPk).toHaveBeenCalledWith(
        'a-id',
        { teacherId: 'teacher-id', weeklyHours: null },
        undefined,
      );
    });

    it('validates a new teacher', async () => {
      mockAssignment();
      usersService.findOrganizationTeachers.mockResolvedValue([]);

      await expect(
        service.updateClassroomSubject(actor, 'classroom-id', 'a-id', {
          teacherId: 'other-id',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('removes an assignment of the classroom', async () => {
    mockAssignment();

    await service.removeClassroomSubject(actor, 'classroom-id', 'a-id');

    expect(repository.deleteByPk).toHaveBeenCalledWith('a-id', undefined);
  });

  describe('listMyAssignments', () => {
    it('uses the active year and only the assignments of the teacher', async () => {
      const result = await service.listMyAssignments(actor);

      expect(academicYearsService.findOne).toHaveBeenCalledWith(
        { organizationId: 'org-id', isActive: true },
        false,
        { attributes: ['id', 'name', 'status'] },
      );
      expect(repository.findAll.mock.calls[0][0]).toEqual({
        organizationId: 'org-id',
        teacherId: 'teacher-id',
      });
      expect(repository.findAll.mock.calls[0][1].include[1]).toMatchObject({
        where: { academicYearId: 'year-id' },
        required: true,
      });
      expect(result).toEqual({
        academicYear: { id: 'year-id', status: AcademicYearStatusEnum.OPEN },
        assignments: [],
      });
    });

    it('validates a requested year against the organization', async () => {
      await service.listMyAssignments(actor, 'other-year');

      expect(academicYearsService.findOne).toHaveBeenCalledWith(
        { id: 'other-year', organizationId: 'org-id' },
        true,
        { attributes: ['id', 'name', 'status'] },
      );
    });

    it('returns nothing when the organization has no active year', async () => {
      academicYearsService.findOne.mockResolvedValue(null);

      await expect(service.listMyAssignments(actor)).resolves.toEqual({
        academicYear: null,
        assignments: [],
      });
      expect(repository.findAll).not.toHaveBeenCalled();
    });
  });

  describe('copyStructure', () => {
    const dto = {
      sourceAcademicYearId: 'year-2026',
      targetAcademicYearId: 'year-2027',
    };

    beforeEach(() => {
      classroomsService.findAll.mockImplementation(
        (query: { academicYearId: string }) =>
          Promise.resolve(
            query.academicYearId === 'year-2026'
              ? [
                  {
                    id: 'c1',
                    gradeLevelId: 'g1',
                    name: '1°A',
                    homeroomTeacherId: 'teacher-id',
                    capacity: 30,
                  },
                  {
                    id: 'c2',
                    gradeLevelId: 'g1',
                    name: '1°B',
                    homeroomTeacherId: 'former-teacher',
                    capacity: null,
                  },
                  {
                    id: 'c3',
                    gradeLevelId: 'g2',
                    name: '2°A',
                    homeroomTeacherId: null,
                    capacity: null,
                  },
                ]
              : [{ name: '2°a' }],
          ),
      );
      repository.findAll.mockResolvedValue([
        {
          classroomId: 'c1',
          subjectId: 'math',
          teacherId: 'teacher-id',
          weeklyHours: 5,
          weightInGpa: 1,
        },
        {
          classroomId: 'c2',
          subjectId: 'math',
          teacherId: 'former-teacher',
          weeklyHours: null,
          weightInGpa: 2,
        },
      ]);
    });

    it('copies the missing classrooms and their subjects into the target year', async () => {
      await expect(service.copyStructure(actor, dto)).resolves.toEqual({
        classrooms: 2,
        subjects: 2,
        skipped: ['2°A'],
      });

      expect(classroomsService.create).toHaveBeenCalledTimes(2);
      expect(classroomsService.create).toHaveBeenCalledWith(
        {
          organizationId: 'org-id',
          academicYearId: 'year-2027',
          gradeLevelId: 'g1',
          name: '1°A',
          capacity: 30,
          homeroomTeacherId: 'teacher-id',
        },
        { transaction },
      );
      // Quien ya no es profesor activo queda sin asignar.
      expect(classroomsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: '1°B', homeroomTeacherId: null }),
        { transaction },
      );
      expect(repository.findAll).toHaveBeenCalledWith(
        { classroomId: ['c1', 'c2'] },
        expect.anything(),
      );
      expect(repository.insertMany).toHaveBeenCalledWith(
        [
          {
            organizationId: 'org-id',
            classroomId: 'new-1°A',
            subjectId: 'math',
            teacherId: 'teacher-id',
            weeklyHours: 5,
            weightInGpa: 1,
          },
          {
            organizationId: 'org-id',
            classroomId: 'new-1°B',
            subjectId: 'math',
            teacherId: null,
            weeklyHours: null,
            weightInGpa: 2,
          },
        ],
        { transaction },
      );
    });

    it('rejects copying a year onto itself', async () => {
      await expect(
        service.copyStructure(actor, {
          sourceAcademicYearId: 'year-2026',
          targetAcademicYearId: 'year-2026',
        }),
      ).rejects.toThrow(SAME_YEAR_COPY_MESSAGE);
    });

    it('rejects a closed target year', async () => {
      academicYearsService.findOne.mockResolvedValue({
        id: 'year-2027',
        status: AcademicYearStatusEnum.CLOSED,
      });

      await expect(service.copyStructure(actor, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(classroomsService.create).not.toHaveBeenCalled();
    });

    it('does nothing when every classroom already exists', async () => {
      classroomsService.findAll.mockResolvedValue([{ name: '1°A' }]);

      await expect(service.copyStructure(actor, dto)).resolves.toEqual({
        classrooms: 0,
        subjects: 0,
        skipped: ['1°A'],
      });
      expect(repository.transaction).not.toHaveBeenCalled();
    });
  });
});
