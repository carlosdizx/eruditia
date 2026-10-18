import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import PromotionOutcomeEnum from '@common/enums/promotion-outcome.enum';
import StudentStatusEnum from '@common/enums/student-status.enum';
import PromotionsService from '../../src/enrollments/promotions.service';
import EnrollmentsService from '../../src/enrollments/enrollments.service';
import ClassroomsService from '../../src/classrooms/classrooms.service';
import AcademicYearsService from '../../src/academic-years/academic-years.service';
import StudentsService from '../../src/students/students.service';
import GradingScalesService from '../../src/grading-scales/grading-scales.service';
import AnnualResultsService from '../../src/gradebooks/annual-results.service';
import {
  ADJUSTED_AVERAGE_RANGE_MESSAGE,
  ADJUSTMENT_REASON_REQUIRED_MESSAGE,
  ALREADY_ENROLLED_MESSAGE,
  CLOSED_TARGET_YEAR_MESSAGE,
  GRADUATE_NOT_FINAL_MESSAGE,
  INVALID_PROMOTION_ENROLLMENTS_MESSAGE,
  INVALID_PROMOTION_TARGET_MESSAGE,
  MANUAL_DECISION_REASON_REQUIRED_MESSAGE,
  PAST_YEAR_PROMOTION_MESSAGE,
  PROMOTE_FINAL_MESSAGE,
  PROMOTION_TARGET_REQUIRED_MESSAGE,
  SAME_YEAR_PROMOTION_MESSAGE,
  TARGET_CLASSROOM_FULL_MESSAGE,
} from '../../src/enrollments/constants/enrollment-messages.constant';

type Query = Record<string, unknown>;

describe('PromotionsService', () => {
  let enrollmentsService: {
    findAll: jest.Mock;
    updateByPk: jest.Mock;
    insertMany: jest.Mock;
    transaction: jest.Mock;
  };
  let classroomsService: { findOne: jest.Mock; findAll: jest.Mock };
  let academicYearsService: { findOne: jest.Mock };
  let studentsService: { updateByPk: jest.Mock };
  let gradingScalesService: { findScale: jest.Mock };
  let annualResultsService: { loadClassroom: jest.Mock };
  let service: PromotionsService;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const actor = { organizationId: 'org-id', userId: 'admin-id' };

  const grade = (sequenceOrder: number, isFinalGrade = false) => ({
    id: `g${sequenceOrder}`,
    name: `Grado ${sequenceOrder}`,
    sequenceOrder,
    isFinalGrade,
  });

  const source = (isFinalGrade = false) => ({
    id: 'source',
    name: '1°B',
    academicYearId: 'y2026',
    gradeLevelId: 'g1',
    academicYear: { id: 'y2026', startDate: '2026-01-15' },
    gradeLevel: grade(1, isFinalGrade),
  });

  const targetYear = {
    id: 'y2027',
    name: '2027',
    startDate: '2027-01-15',
    status: AcademicYearStatusEnum.OPEN,
  };

  // Salones del año destino: dos de 1° y dos de 2° (3° no se ofrece).
  const targetClassrooms = [
    {
      id: 't1a',
      name: '1°A',
      capacity: null,
      gradeLevelId: 'g1',
      gradeLevel: grade(1),
    },
    {
      id: 't1b',
      name: '1°B',
      capacity: null,
      gradeLevelId: 'g1',
      gradeLevel: grade(1),
    },
    {
      id: 't2a',
      name: '2°A',
      capacity: 2,
      gradeLevelId: 'g2',
      gradeLevel: grade(2),
    },
    {
      id: 't2b',
      name: '2°B',
      capacity: null,
      gradeLevelId: 'g2',
      gradeLevel: grade(2),
    },
    {
      id: 't3a',
      name: '3°A',
      capacity: null,
      gradeLevelId: 'g3',
      gradeLevel: grade(3),
    },
  ];

  const sourceEnrollments = [
    {
      id: 'e1',
      studentId: 's1',
      promotionNotes: null,
      student: { id: 's1', firstName: 'Ana', lastName: 'López' },
    },
    {
      id: 'e2',
      studentId: 's2',
      promotionNotes: null,
      student: { id: 's2', firstName: 'Luis', lastName: 'Pérez' },
    },
    {
      id: 'e3',
      studentId: 's3',
      promotionNotes: null,
      student: { id: 's3', firstName: 'Eva', lastName: 'Ruiz' },
    },
  ];

  const scale = {
    minScore: 1,
    maxScore: 5,
    passingScore: 3,
    decimalPlaces: 1,
    maxFailedSubjects: 1,
    failByAverage: false,
    isDefault: false,
  };
  const failed = (...names: string[]) =>
    names.map((name) => ({ subject: { name } }));
  // Resultado de las planillas: Ana aprueba, Luis no, Eva sin notas.
  let annualResults: Record<string, object>;

  let alreadyEnrolled: object[];
  let inProgressCounts: object[];

  beforeEach(() => {
    alreadyEnrolled = [];
    inProgressCounts = [];
    annualResults = {
      e1: {
        averages: { general: 4.2 },
        failedSubjects: failed(),
        incomplete: false,
      },
      e2: {
        averages: { general: 2.5 },
        failedSubjects: failed('Matemáticas'),
        incomplete: false,
      },
      e3: {
        averages: { general: null },
        failedSubjects: failed(),
        incomplete: true,
      },
    };
    enrollmentsService = {
      findAll: jest.fn((query: Query) => {
        if (query.academicYearId === 'y2027')
          return Promise.resolve(alreadyEnrolled);
        if (Array.isArray(query.classroomId))
          return Promise.resolve(inProgressCounts);
        if (Array.isArray(query.id))
          return Promise.resolve(
            sourceEnrollments.filter(({ id }) =>
              (query.id as string[]).includes(id),
            ),
          );
        return Promise.resolve(sourceEnrollments);
      }),
      updateByPk: jest.fn().mockResolvedValue({}),
      insertMany: jest.fn((rows: object[]) => Promise.resolve(rows)),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    classroomsService = {
      findOne: jest.fn().mockResolvedValue(source()),
      findAll: jest.fn((query: Query) =>
        Promise.resolve(
          query.academicYearId === 'y2027'
            ? targetClassrooms
            : [{ id: 'source-a' }, { id: 'source' }],
        ),
      ),
    };
    academicYearsService = {
      findOne: jest.fn().mockResolvedValue(targetYear),
    };
    studentsService = { updateByPk: jest.fn().mockResolvedValue({}) };
    gradingScalesService = {
      findScale: jest.fn().mockResolvedValue(scale),
    };
    annualResultsService = {
      loadClassroom: jest.fn().mockResolvedValue({
        resultsFor: (id: string) => annualResults[id],
      }),
    };
    service = new PromotionsService(
      enrollmentsService as unknown as EnrollmentsService,
      classroomsService as unknown as ClassroomsService,
      academicYearsService as unknown as AcademicYearsService,
      studentsService as unknown as StudentsService,
      gradingScalesService as unknown as GradingScalesService,
      annualResultsService as unknown as AnnualResultsService,
    );
  });

  const query = { sourceClassroomId: 'source', targetAcademicYearId: 'y2027' };

  describe('validations', () => {
    it('scopes the classroom and the year to the organization', async () => {
      await service.preview(actor, query);

      expect(classroomsService.findOne).toHaveBeenCalledWith(
        { id: 'source', organizationId: 'org-id' },
        true,
        expect.any(Object),
      );
      expect(academicYearsService.findOne).toHaveBeenCalledWith(
        { id: 'y2027', organizationId: 'org-id' },
        true,
        expect.any(Object),
      );
    });

    it('rejects the same year', async () => {
      academicYearsService.findOne.mockResolvedValue({
        ...targetYear,
        id: 'y2026',
      });

      await expect(service.preview(actor, query)).rejects.toThrow(
        new BadRequestException(SAME_YEAR_PROMOTION_MESSAGE),
      );
    });

    it('rejects a target year that starts before the source', async () => {
      academicYearsService.findOne.mockResolvedValue({
        ...targetYear,
        startDate: '2025-01-15',
      });

      await expect(service.preview(actor, query)).rejects.toThrow(
        new BadRequestException(PAST_YEAR_PROMOTION_MESSAGE),
      );
    });

    it('rejects a closed target year', async () => {
      academicYearsService.findOne.mockResolvedValue({
        ...targetYear,
        status: AcademicYearStatusEnum.CLOSED,
      });

      await expect(service.preview(actor, query)).rejects.toThrow(
        new ConflictException(CLOSED_TARGET_YEAR_MESSAGE),
      );
    });
  });

  describe('preview', () => {
    it('suggests each outcome and the same section in the next grade', async () => {
      alreadyEnrolled = [
        { studentId: 's3', classroom: { id: 't1a', name: '1°A' } },
      ];
      inProgressCounts = [{ classroomId: 't2a' }];

      const result = await service.preview(actor, query);

      expect(result.passingGrade).toBe(3);
      expect(annualResultsService.loadClassroom).toHaveBeenCalledWith(
        { id: 'source', academicYearId: 'y2026' },
        ['e1', 'e2', 'e3'],
        scale,
      );
      expect(result.students[1]).toMatchObject({
        computedAverage: 2.5,
        failedSubjects: ['Matemáticas'],
        incomplete: false,
      });
      expect(result.sameClassrooms.map(({ id }) => id)).toEqual(['t1a', 't1b']);
      expect(result.nextClassrooms).toEqual([
        { id: 't2a', name: '2°A', capacity: 2, enrolled: 1 },
        { id: 't2b', name: '2°B', capacity: null, enrolled: 0 },
      ]);
      expect(result.nextGradeLevel).toEqual(grade(2));
      // 1°B es el segundo salón de 1°: se sugiere 2°B y 1°B.
      expect(result.suggestedNextClassroomId).toBe('t2b');
      expect(result.suggestedSameClassroomId).toBe('t1b');
      expect(
        result.students.map(({ enrollmentId, suggestedOutcome }) => [
          enrollmentId,
          suggestedOutcome,
        ]),
      ).toEqual([
        ['e1', PromotionOutcomeEnum.PROMOTE],
        ['e2', PromotionOutcomeEnum.REPEAT],
        ['e3', null],
      ]);
      expect(result.students[2].targetEnrollment).toEqual({
        classroomId: 't1a',
        classroomName: '1°A',
      });
    });

    it('fails the year with a single failed subject despite the average', async () => {
      annualResults.e1 = {
        averages: { general: 3.8 },
        failedSubjects: failed('Inglés'),
        incomplete: false,
      };

      const result = await service.preview(actor, query);

      expect(result.students[0].suggestedOutcome).toBe(
        PromotionOutcomeEnum.REPEAT,
      );
    });

    it('ignores failed subjects when the rule is off', async () => {
      gradingScalesService.findScale.mockResolvedValue({
        ...scale,
        maxFailedSubjects: null,
      });
      annualResults.e1 = {
        averages: { general: 3.8 },
        failedSubjects: failed('Inglés', 'Química', 'Física'),
        incomplete: false,
      };

      const result = await service.preview(actor, query);

      expect(result.students[0].suggestedOutcome).toBe(
        PromotionOutcomeEnum.PROMOTE,
      );
    });

    it('ignores a low average unless the school enables it', async () => {
      annualResults.e1 = {
        averages: { general: 2.8 },
        failedSubjects: failed(),
        incomplete: false,
      };

      expect(
        (await service.preview(actor, query)).students[0].suggestedOutcome,
      ).toBe(PromotionOutcomeEnum.PROMOTE);

      gradingScalesService.findScale.mockResolvedValue({
        ...scale,
        failByAverage: true,
      });
      expect(
        (await service.preview(actor, query)).students[0].suggestedOutcome,
      ).toBe(PromotionOutcomeEnum.REPEAT);
    });

    it('suggests graduating from the final grade', async () => {
      classroomsService.findOne.mockResolvedValue(source(true));

      const result = await service.preview(actor, query);

      expect(result.nextClassrooms).toEqual([]);
      expect(result.suggestedNextClassroomId).toBeNull();
      expect(result.students[0].suggestedOutcome).toBe(
        PromotionOutcomeEnum.GRADUATE,
      );
    });
  });

  describe('promote', () => {
    const promote = (decisions: object[], enrollmentDate?: string) =>
      service.promote(actor, {
        ...query,
        enrollmentDate,
        decisions,
      } as never);

    it('closes the source enrollments and creates the new ones', async () => {
      const result = await promote(
        [
          {
            enrollmentId: 'e1',
            outcome: PromotionOutcomeEnum.PROMOTE,
            targetClassroomId: 't2b',
          },
          {
            enrollmentId: 'e2',
            outcome: PromotionOutcomeEnum.REPEAT,
            targetClassroomId: 't1b',
            promotionNotes: '  Comité 12/11  ',
          },
        ],
        '2027-01-20',
      );

      expect(enrollmentsService.updateByPk).toHaveBeenCalledWith(
        'e1',
        {
          status: EnrollmentStatusEnum.PROMOTED,
          finalAverage: 4.2,
          computedAverage: 4.2,
          averageAdjustedBy: null,
        },
        { transaction },
      );
      expect(enrollmentsService.updateByPk).toHaveBeenCalledWith(
        'e2',
        {
          status: EnrollmentStatusEnum.FAILED,
          finalAverage: 2.5,
          computedAverage: 2.5,
          averageAdjustedBy: null,
          promotionNotes: 'Comité 12/11',
        },
        { transaction },
      );
      expect(enrollmentsService.insertMany).toHaveBeenCalledWith(
        [
          {
            organizationId: 'org-id',
            studentId: 's1',
            academicYearId: 'y2027',
            classroomId: 't2b',
            enrollmentDate: '2027-01-20',
            promotedFromEnrollmentId: 'e1',
          },
          {
            organizationId: 'org-id',
            studentId: 's2',
            academicYearId: 'y2027',
            classroomId: 't1b',
            enrollmentDate: '2027-01-20',
            promotedFromEnrollmentId: 'e2',
          },
        ],
        { transaction },
      );
      expect(studentsService.updateByPk).not.toHaveBeenCalled();
      expect(result).toEqual({ promoted: 1, repeated: 1, graduated: 0 });
    });

    it('graduates the enrollment and the student from the final grade', async () => {
      classroomsService.findOne.mockResolvedValue(source(true));

      const result = await promote([
        { enrollmentId: 'e1', outcome: PromotionOutcomeEnum.GRADUATE },
      ]);

      expect(enrollmentsService.updateByPk).toHaveBeenCalledWith(
        'e1',
        {
          status: EnrollmentStatusEnum.GRADUATED,
          finalAverage: 4.2,
          computedAverage: 4.2,
          averageAdjustedBy: null,
        },
        { transaction },
      );
      expect(enrollmentsService.insertMany).not.toHaveBeenCalled();
      expect(studentsService.updateByPk).toHaveBeenCalledWith(
        's1',
        { status: StudentStatusEnum.GRADUATED },
        { transaction },
      );
      expect(result).toEqual({ promoted: 0, repeated: 0, graduated: 1 });
    });

    it('rejects enrollments that are no longer in progress here', async () => {
      await expect(
        promote([
          {
            enrollmentId: 'other',
            outcome: PromotionOutcomeEnum.REPEAT,
            targetClassroomId: 't1a',
          },
        ]),
      ).rejects.toThrow(
        new BadRequestException(INVALID_PROMOTION_ENROLLMENTS_MESSAGE),
      );
    });

    it('only graduates from the final grade', async () => {
      await expect(
        promote([
          { enrollmentId: 'e1', outcome: PromotionOutcomeEnum.GRADUATE },
        ]),
      ).rejects.toThrow(new BadRequestException(GRADUATE_NOT_FINAL_MESSAGE));
    });

    it('does not promote from the final grade', async () => {
      classroomsService.findOne.mockResolvedValue(source(true));

      await expect(
        promote([
          {
            enrollmentId: 'e1',
            outcome: PromotionOutcomeEnum.PROMOTE,
            targetClassroomId: 't2a',
          },
        ]),
      ).rejects.toThrow(new BadRequestException(PROMOTE_FINAL_MESSAGE));
    });

    it('requires a target classroom', async () => {
      await expect(
        promote([{ enrollmentId: 'e1', outcome: PromotionOutcomeEnum.REPEAT }]),
      ).rejects.toThrow(
        new BadRequestException(PROMOTION_TARGET_REQUIRED_MESSAGE),
      );
    });

    it.each([
      [PromotionOutcomeEnum.PROMOTE, 't1a'],
      [PromotionOutcomeEnum.PROMOTE, 't3a'],
      [PromotionOutcomeEnum.REPEAT, 't2a'],
    ])('rejects %s into %s', async (outcome, targetClassroomId) => {
      await expect(
        promote([{ enrollmentId: 'e1', outcome, targetClassroomId }]),
      ).rejects.toThrow(
        new BadRequestException(INVALID_PROMOTION_TARGET_MESSAGE),
      );
    });

    it('rejects students already enrolled in the target year', async () => {
      alreadyEnrolled = [{ studentId: 's2' }];

      await expect(
        promote([
          {
            enrollmentId: 'e2',
            outcome: PromotionOutcomeEnum.REPEAT,
            targetClassroomId: 't1a',
          },
        ]),
      ).rejects.toThrow(
        new ConflictException(ALREADY_ENROLLED_MESSAGE(['Luis Pérez'])),
      );
      expect(enrollmentsService.transaction).not.toHaveBeenCalled();
    });

    it('saves an adjusted average with who adjusted it and why', async () => {
      await promote([
        {
          enrollmentId: 'e2',
          outcome: PromotionOutcomeEnum.REPEAT,
          targetClassroomId: 't1a',
          adjustedAverage: 2.8,
          promotionNotes: 'Recuperó Matemáticas',
        },
      ]);

      expect(enrollmentsService.updateByPk).toHaveBeenCalledWith(
        'e2',
        expect.objectContaining({
          finalAverage: 2.8,
          computedAverage: 2.5,
          averageAdjustedBy: 'admin-id',
        }),
        { transaction },
      );
    });

    it('requires the reason to adjust the average', async () => {
      await expect(
        promote([
          {
            enrollmentId: 'e2',
            outcome: PromotionOutcomeEnum.REPEAT,
            targetClassroomId: 't1a',
            adjustedAverage: 2.8,
          },
        ]),
      ).rejects.toThrow(
        new BadRequestException(
          ADJUSTMENT_REASON_REQUIRED_MESSAGE('Luis Pérez'),
        ),
      );
      expect(enrollmentsService.transaction).not.toHaveBeenCalled();
    });

    it('keeps the adjusted average inside the scale', async () => {
      await expect(
        promote([
          {
            enrollmentId: 'e1',
            outcome: PromotionOutcomeEnum.PROMOTE,
            targetClassroomId: 't2a',
            adjustedAverage: 7,
            promotionNotes: 'Error',
          },
        ]),
      ).rejects.toThrow(
        new BadRequestException(
          ADJUSTED_AVERAGE_RANGE_MESSAGE('Ana López', '1.0', '5.0'),
        ),
      );
    });

    it('does not count sending the same average as an adjustment', async () => {
      await promote([
        {
          enrollmentId: 'e1',
          outcome: PromotionOutcomeEnum.PROMOTE,
          targetClassroomId: 't2a',
          adjustedAverage: 4.2,
        },
      ]);

      expect(enrollmentsService.updateByPk).toHaveBeenCalledWith(
        'e1',
        expect.objectContaining({ averageAdjustedBy: null }),
        { transaction },
      );
    });

    it.each([
      [
        'promoting a failing student',
        'e2',
        PromotionOutcomeEnum.PROMOTE,
        't2a',
      ],
      ['failing a passing student', 'e1', PromotionOutcomeEnum.REPEAT, 't1a'],
      ['deciding without grades', 'e3', PromotionOutcomeEnum.PROMOTE, 't2a'],
    ])(
      'requires the reason for %s',
      async (_, enrollmentId, outcome, targetClassroomId) => {
        const name = sourceEnrollments.find(
          ({ id }) => id === enrollmentId,
        )!.student;

        await expect(
          promote([{ enrollmentId, outcome, targetClassroomId }]),
        ).rejects.toThrow(
          new BadRequestException(
            MANUAL_DECISION_REASON_REQUIRED_MESSAGE(
              `${name.firstName} ${name.lastName}`,
            ),
          ),
        );
      },
    );

    it('accepts a manual decision with its reason', async () => {
      await promote([
        {
          enrollmentId: 'e2',
          outcome: PromotionOutcomeEnum.PROMOTE,
          targetClassroomId: 't2a',
          promotionNotes: 'Comisión de evaluación',
        },
      ]);

      expect(enrollmentsService.updateByPk).toHaveBeenCalledWith(
        'e2',
        expect.objectContaining({
          status: EnrollmentStatusEnum.PROMOTED,
          promotionNotes: 'Comisión de evaluación',
        }),
        { transaction },
      );
    });

    it('respects the capacity of the target classroom', async () => {
      inProgressCounts = [{ classroomId: 't2a' }];

      await expect(
        promote(
          ['e1', 'e2'].map((enrollmentId) => ({
            enrollmentId,
            outcome: PromotionOutcomeEnum.PROMOTE,
            targetClassroomId: 't2a',
          })),
        ),
      ).rejects.toThrow(
        new ConflictException(TARGET_CLASSROOM_FULL_MESSAGE('2°A', 2)),
      );
      expect(enrollmentsService.transaction).not.toHaveBeenCalled();
    });
  });
});
