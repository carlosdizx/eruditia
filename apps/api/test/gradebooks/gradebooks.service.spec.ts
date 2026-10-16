import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import GradebooksService, {
  DEFAULT_EVALUATION_ITEM,
} from '../../src/gradebooks/gradebooks.service';
import AcademicPeriodRepository from '../../src/academic-years/repositories/academic-period.repository';
import ClassroomRepository from '../../src/classrooms/classroom.repository';
import ClassroomSubjectRepository from '../../src/classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../../src/enrollments/enrollment.repository';
import GradingScalesService from '../../src/grading-scales/grading-scales.service';
import EvaluationItemRepository from '../../src/gradebooks/repositories/evaluation-item.repository';
import StudentGradeRepository from '../../src/gradebooks/repositories/student-grade.repository';
import PeriodSubjectSummaryRepository from '../../src/gradebooks/repositories/period-subject-summary.repository';
import {
  EVALUATION_ITEMS_WEIGHT_MESSAGE,
  GRADEBOOK_PERIOD_CLOSED_MESSAGE,
  GRADEBOOK_READ_ONLY_MESSAGE,
  GRADEBOOK_YEAR_CLOSED_MESSAGE,
  INVALID_EVALUATION_ITEMS_MESSAGE,
  INVALID_GRADE_ENROLLMENTS_MESSAGE,
  SCORE_DECIMALS_MESSAGE,
  SCORE_OUT_OF_RANGE_MESSAGE,
} from '../../src/gradebooks/constants/gradebook-messages.constant';

type Mocked = Record<string, jest.Mock>;

describe('GradebooksService', () => {
  let classroomSubjectRepository: Mocked;
  let classroomRepository: Mocked;
  let periodRepository: Mocked;
  let enrollmentRepository: Mocked;
  let itemRepository: Mocked;
  let gradeRepository: Mocked;
  let summaryRepository: Mocked;
  let gradingScalesService: Mocked;
  let service: GradebooksService;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const admin = {
    organizationId: 'org-id',
    userId: 'admin-id',
    roleName: RoleNameEnum.ADMIN,
  };
  const teacher = { ...admin, userId: 'teacher-id', roleName: 'TEACHER' };
  const scale = {
    minScore: 1,
    maxScore: 5,
    passingScore: 3,
    decimalPlaces: 1,
    isDefault: false,
  };
  const open = {
    id: 'p1',
    name: 'Periodo 1',
    orderIndex: 1,
    weightPercentage: 50,
    isOpenForGrading: true,
  };
  const closed = { ...open, id: 'p2', orderIndex: 2, isOpenForGrading: false };
  const items = [
    { id: 'i1', title: 'Examen', weightPercentage: 60, sortOrder: 0 },
    { id: 'i2', title: 'Tareas', weightPercentage: 40, sortOrder: 1 },
  ];
  const student = (firstName: string) => ({
    id: `s-${firstName}`,
    firstName,
    lastName: 'Pérez',
  });
  const enrollments = [
    {
      id: 'e1',
      status: EnrollmentStatusEnum.IN_PROGRESS,
      student: student('Ana'),
    },
    {
      id: 'e2',
      status: EnrollmentStatusEnum.WITHDRAWN,
      student: student('Luis'),
    },
  ];

  const assignment = (overrides: object = {}) => ({
    id: 'cs-id',
    teacherId: 'teacher-id',
    subject: { id: 'math', name: 'Matemáticas' },
    teacher: { id: 'teacher-id', firstName: 'Rosa', lastName: 'Gil' },
    classroom: {
      id: 'classroom-id',
      name: '5°A',
      academicYearId: 'y2026',
      homeroomTeacherId: 'homeroom-id',
      gradeLevel: { id: 'g5', name: 'Quinto' },
      academicYear: {
        id: 'y2026',
        name: '2026',
        status: AcademicYearStatusEnum.OPEN,
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    classroomSubjectRepository = {
      findOne: jest.fn().mockResolvedValue(assignment()),
      findAll: jest.fn().mockResolvedValue([]),
    };
    classroomRepository = { findOne: jest.fn() };
    periodRepository = { findAll: jest.fn().mockResolvedValue([open, closed]) };
    enrollmentRepository = {
      findAll: jest.fn().mockResolvedValue(enrollments),
    };
    itemRepository = {
      findAll: jest.fn().mockResolvedValue(items),
      create: jest.fn().mockResolvedValue({ id: 'default' }),
      insertMany: jest.fn().mockResolvedValue([]),
      updateByPk: jest.fn().mockResolvedValue({}),
      deleteOthers: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    gradeRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      upsertMany: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    summaryRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      upsertMany: jest.fn().mockResolvedValue(undefined),
    };
    gradingScalesService = { findScale: jest.fn().mockResolvedValue(scale) };

    service = new GradebooksService(
      classroomSubjectRepository as unknown as ClassroomSubjectRepository,
      classroomRepository as unknown as ClassroomRepository,
      periodRepository as unknown as AcademicPeriodRepository,
      enrollmentRepository as unknown as EnrollmentRepository,
      itemRepository as unknown as EvaluationItemRepository,
      gradeRepository as unknown as StudentGradeRepository,
      summaryRepository as unknown as PeriodSubjectSummaryRepository,
      gradingScalesService as unknown as GradingScalesService,
    );
  });

  describe('getGradebook', () => {
    it('opens the first open period with rows, grades and summaries', async () => {
      gradeRepository.findAll.mockResolvedValue([
        {
          enrollmentId: 'e1',
          evaluationItemId: 'i1',
          score: 4,
          feedback: null,
        },
      ]);
      summaryRepository.findAll.mockResolvedValue([
        {
          enrollmentId: 'e1',
          finalPeriodScore: 4,
          isPassed: true,
          teacherObservation: 'Muy bien',
        },
      ]);

      const result = await service.getGradebook(teacher, 'cs-id');

      expect(classroomSubjectRepository.findOne).toHaveBeenCalledWith(
        { id: 'cs-id', organizationId: 'org-id' },
        false,
        expect.any(Object),
      );
      expect(result.period).toBe(open);
      expect(result.lock).toBeNull();
      expect(result.scale).toBe(scale);
      expect(result.students).toEqual([
        {
          enrollmentId: 'e1',
          status: EnrollmentStatusEnum.IN_PROGRESS,
          student: student('Ana'),
          editable: true,
          grades: { i1: { score: 4, feedback: null } },
          finalPeriodScore: 4,
          isPassed: true,
          teacherObservation: 'Muy bien',
        },
        expect.objectContaining({
          enrollmentId: 'e2',
          editable: false,
          grades: {},
          finalPeriodScore: null,
        }),
      ]);
    });

    it('creates the single default column when there are no activities', async () => {
      itemRepository.findAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'default', ...DEFAULT_EVALUATION_ITEM }]);

      const result = await service.getGradebook(teacher, 'cs-id', 'p1');

      expect(itemRepository.create).toHaveBeenCalledWith({
        ...DEFAULT_EVALUATION_ITEM,
        sortOrder: 0,
        organizationId: 'org-id',
        classroomSubjectId: 'cs-id',
        academicPeriodId: 'p1',
      });
      expect(result.items).toEqual([
        { id: 'default', ...DEFAULT_EVALUATION_ITEM },
      ]);
    });

    it('locks a closed period for the teacher without creating columns', async () => {
      itemRepository.findAll.mockResolvedValue([]);

      const result = await service.getGradebook(teacher, 'cs-id', 'p2');

      expect(result.lock).toBe('period_closed');
      expect(itemRepository.create).not.toHaveBeenCalled();
    });

    it('lets the admin grade a closed period', async () => {
      await expect(
        service.getGradebook(admin, 'cs-id', 'p2'),
      ).resolves.toMatchObject({ lock: null });
    });

    it('is read-only for the homeroom teacher', async () => {
      await expect(
        service.getGradebook({ ...teacher, userId: 'homeroom-id' }, 'cs-id'),
      ).resolves.toMatchObject({ lock: 'read_only' });
    });

    it('hides subjects the teacher neither teaches nor directs', async () => {
      await expect(
        service.getGradebook({ ...teacher, userId: 'other-id' }, 'cs-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a period from another year', async () => {
      await expect(
        service.getGradebook(teacher, 'cs-id', 'other-period'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns an empty gradebook when the year has no periods', async () => {
      periodRepository.findAll.mockResolvedValue([]);

      await expect(
        service.getGradebook(teacher, 'cs-id'),
      ).resolves.toMatchObject({ period: null, items: [], students: [] });
    });
  });

  describe('saveGrades', () => {
    const save = (students: object[], actor: object = teacher, period = 'p1') =>
      service.saveGrades(actor as typeof teacher, 'cs-id', period, {
        students,
      } as never);

    it('upserts, deletes and recalculates the period summary', async () => {
      gradeRepository.findAll.mockResolvedValue([
        {
          enrollmentId: 'e1',
          evaluationItemId: 'i2',
          score: 2,
          feedback: 'Entregar a tiempo',
        },
      ]);

      await save([
        {
          enrollmentId: 'e1',
          grades: [
            { evaluationItemId: 'i1', score: 4 },
            { evaluationItemId: 'i2', score: 3 },
          ],
          teacherObservation: '  Mejoró  ',
        },
      ]);

      expect(gradeRepository.upsertMany).toHaveBeenCalledWith(
        [
          {
            score: 4,
            feedback: null,
            organizationId: 'org-id',
            enrollmentId: 'e1',
            evaluationItemId: 'i1',
            updatedBy: 'teacher-id',
          },
          // Conserva la retroalimentación si no se envía.
          expect.objectContaining({ score: 3, feedback: 'Entregar a tiempo' }),
        ],
        transaction,
      );
      expect(summaryRepository.upsertMany).toHaveBeenCalledWith(
        [
          {
            organizationId: 'org-id',
            enrollmentId: 'e1',
            classroomSubjectId: 'cs-id',
            academicPeriodId: 'p1',
            finalPeriodScore: 3.6,
            isPassed: true,
            teacherObservation: 'Mejoró',
          },
        ],
        transaction,
      );
    });

    it('clears a grade with null and marks the student as failing', async () => {
      gradeRepository.findAll.mockResolvedValue([
        { enrollmentId: 'e1', evaluationItemId: 'i1', score: 5 },
        { enrollmentId: 'e1', evaluationItemId: 'i2', score: 2 },
      ]);

      await save([
        {
          enrollmentId: 'e1',
          grades: [{ evaluationItemId: 'i1', score: null }],
        },
      ]);

      expect(gradeRepository.deleteMany).toHaveBeenCalledWith(
        [{ enrollmentId: 'e1', evaluationItemId: 'i1' }],
        transaction,
      );
      expect(summaryRepository.upsertMany).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            finalPeriodScore: 2,
            isPassed: false,
            teacherObservation: null,
          }),
        ],
        transaction,
      );
    });

    it.each([
      [6, SCORE_OUT_OF_RANGE_MESSAGE('Ana Pérez', '1.0', '5.0')],
      [0.5, SCORE_OUT_OF_RANGE_MESSAGE('Ana Pérez', '1.0', '5.0')],
      [3.25, SCORE_DECIMALS_MESSAGE('Ana Pérez', 1)],
    ])('rejects the score %p', async (score, message) => {
      await expect(
        save([
          { enrollmentId: 'e1', grades: [{ evaluationItemId: 'i1', score }] },
        ]),
      ).rejects.toThrow(new BadRequestException(message));
      expect(gradeRepository.transaction).not.toHaveBeenCalled();
    });

    it('rejects withdrawn students and foreign activities', async () => {
      await expect(save([{ enrollmentId: 'e2', grades: [] }])).rejects.toThrow(
        new BadRequestException(INVALID_GRADE_ENROLLMENTS_MESSAGE),
      );
      await expect(
        save([
          {
            enrollmentId: 'e1',
            grades: [{ evaluationItemId: 'other', score: 4 }],
          },
        ]),
      ).rejects.toThrow(
        new BadRequestException(INVALID_EVALUATION_ITEMS_MESSAGE),
      );
    });

    it('enforces the locks', async () => {
      await expect(save([], teacher, 'p2')).rejects.toThrow(
        new ConflictException(GRADEBOOK_PERIOD_CLOSED_MESSAGE),
      );
      await expect(
        save([], { ...teacher, userId: 'homeroom-id' }),
      ).rejects.toThrow(new ForbiddenException(GRADEBOOK_READ_ONLY_MESSAGE));

      classroomSubjectRepository.findOne.mockResolvedValue(
        assignment({
          classroom: {
            ...assignment().classroom,
            academicYear: { status: AcademicYearStatusEnum.CLOSED },
          },
        }),
      );
      await expect(save([], admin)).rejects.toThrow(
        new ConflictException(GRADEBOOK_YEAR_CLOSED_MESSAGE),
      );
    });
  });

  describe('setEvaluationItems', () => {
    const setItems = (list: object[]) =>
      service.setEvaluationItems(teacher, 'cs-id', 'p1', {
        items: list,
      } as never);

    it('requires the weights to add up to 100%', async () => {
      await expect(
        setItems([
          { title: 'Examen', weightPercentage: 50 },
          { title: 'Tareas', weightPercentage: 30 },
        ]),
      ).rejects.toThrow(
        new BadRequestException(EVALUATION_ITEMS_WEIGHT_MESSAGE(80)),
      );
    });

    it('rejects activities from another gradebook', async () => {
      await expect(
        setItems([{ id: 'other', title: 'Examen', weightPercentage: 100 }]),
      ).rejects.toThrow(
        new BadRequestException(INVALID_EVALUATION_ITEMS_MESSAGE),
      );
    });

    it('replaces the activities and recalculates with the new weights', async () => {
      gradeRepository.findAll.mockResolvedValue([
        { enrollmentId: 'e1', evaluationItemId: 'i1', score: 4 },
      ]);
      summaryRepository.findAll.mockResolvedValue([
        { enrollmentId: 'e1', teacherObservation: 'Bien' },
      ]);
      itemRepository.insertMany.mockResolvedValue([
        { id: 'i3', weightPercentage: 50 },
      ]);

      await setItems([
        { id: 'i1', title: 'Examen final', weightPercentage: 50 },
        { title: 'Proyecto', weightPercentage: 50 },
      ]);

      expect(itemRepository.deleteOthers).toHaveBeenCalledWith(
        'cs-id',
        'p1',
        ['i1'],
        transaction,
      );
      expect(itemRepository.insertMany).toHaveBeenCalledWith(
        [
          {
            title: 'Proyecto',
            weightPercentage: 50,
            sortOrder: 1,
            organizationId: 'org-id',
            classroomSubjectId: 'cs-id',
            academicPeriodId: 'p1',
          },
        ],
        { transaction },
      );
      expect(itemRepository.updateByPk).toHaveBeenCalledWith(
        'i1',
        { title: 'Examen final', weightPercentage: 50, sortOrder: 0 },
        { transaction },
      );
      expect(summaryRepository.upsertMany).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            enrollmentId: 'e1',
            finalPeriodScore: 4,
            teacherObservation: 'Bien',
          }),
        ],
        transaction,
      );
    });
  });

  describe('listClassroomGradebooks', () => {
    const classroom = {
      id: 'classroom-id',
      name: '5°A',
      homeroomTeacherId: 'homeroom-id',
    };
    const assignments = [
      { id: 'cs-1', teacherId: 'teacher-id', subject: { name: 'Arte' } },
      { id: 'cs-2', teacherId: 'other-id', subject: { name: 'Física' } },
    ];

    beforeEach(() => {
      classroomRepository.findOne.mockResolvedValue(classroom);
      classroomSubjectRepository.findAll.mockResolvedValue(assignments);
    });

    it('lists every subject for the homeroom teacher, managing only theirs', async () => {
      const result = await service.listClassroomGradebooks(
        { ...teacher, userId: 'teacher-id' },
        'classroom-id',
      );
      expect(classroomSubjectRepository.findAll).toHaveBeenCalledWith(
        { classroomId: 'classroom-id', teacherId: 'teacher-id' },
        expect.any(Object),
      );
      expect(result.gradebooks.map(({ canManage }) => canManage)).toEqual([
        true,
        false,
      ]);

      await service.listClassroomGradebooks(
        { ...teacher, userId: 'homeroom-id' },
        'classroom-id',
      );
      expect(classroomSubjectRepository.findAll).toHaveBeenLastCalledWith(
        { classroomId: 'classroom-id' },
        expect.any(Object),
      );
    });

    it('hides classrooms where the teacher has nothing', async () => {
      classroomSubjectRepository.findAll.mockResolvedValue([]);

      await expect(
        service.listClassroomGradebooks(teacher, 'classroom-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
