import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import RecoveriesService from '../../src/gradebooks/recoveries.service';
import AcademicPeriodRepository from '../../src/academic-years/repositories/academic-period.repository';
import AcademicYearRepository from '../../src/academic-years/repositories/academic-year.repository';
import ClassroomSubjectRepository from '../../src/classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../../src/enrollments/enrollment.repository';
import GradingScalesService from '../../src/grading-scales/grading-scales.service';
import PeriodSubjectSummaryRepository from '../../src/gradebooks/repositories/period-subject-summary.repository';
import SubjectRecoveryRepository from '../../src/gradebooks/repositories/subject-recovery.repository';
import {
  GRADEBOOK_YEAR_CLOSED_MESSAGE,
  RECOVERY_ENROLLMENT_MESSAGE,
  RECOVERY_NOT_ALLOWED_MESSAGE,
  RECOVERY_SCORE_DECIMALS_MESSAGE,
  RECOVERY_SCORE_RANGE_MESSAGE,
} from '../../src/gradebooks/constants/gradebook-messages.constant';

type Mocked = Record<string, jest.Mock>;

describe('RecoveriesService', () => {
  let yearRepository: Mocked;
  let classroomSubjectRepository: Mocked;
  let enrollmentRepository: Mocked;
  let summaryRepository: Mocked;
  let recoveryRepository: Mocked;
  let service: RecoveriesService;

  const admin = {
    organizationId: 'org-id',
    userId: 'admin-id',
    roleName: RoleNameEnum.ADMIN,
  };
  const teacher = {
    ...admin,
    userId: 'teacher-id',
    roleName: RoleNameEnum.TEACHER,
  };
  const scale = {
    minScore: 1,
    maxScore: 5,
    passingScore: 3,
    decimalPlaces: 1,
    maxFailedSubjects: 1,
    failByAverage: false,
    isDefault: false,
  };
  const periods = [
    { id: 'p1', name: 'P1', orderIndex: 1, weightPercentage: 50 },
    { id: 'p2', name: 'P2', orderIndex: 2, weightPercentage: 50 },
  ];
  const summary = (enrollmentId: string, periodId: string, score: number) => ({
    classroomSubjectId: 'cs-id',
    enrollmentId,
    academicPeriodId: periodId,
    finalPeriodScore: score,
  });
  const assignment = (status = AcademicYearStatusEnum.OPEN) => ({
    id: 'cs-id',
    classroomId: 'c5',
    teacherId: 'teacher-id',
    subject: { id: 's', name: 'Matemáticas', code: 'MAT' },
    teacher: { id: 'teacher-id', firstName: 'Rosa', lastName: 'Gil' },
    classroom: {
      id: 'c5',
      name: '5°A',
      academicYearId: 'y2026',
      academicYear: { id: 'y2026', status },
    },
  });
  const student = (id: string) => ({ id, firstName: id, lastName: 'Pérez' });

  beforeEach(() => {
    yearRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'y2026',
        name: '2026',
        status: AcademicYearStatusEnum.OPEN,
      }),
    };
    classroomSubjectRepository = {
      findAll: jest.fn().mockResolvedValue([assignment()]),
      findOne: jest.fn().mockResolvedValue(assignment()),
    };
    enrollmentRepository = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 'e1',
          classroomId: 'c5',
          status: EnrollmentStatusEnum.IN_PROGRESS,
          student: student('Ana'),
        },
        {
          id: 'e2',
          classroomId: 'c5',
          status: EnrollmentStatusEnum.IN_PROGRESS,
          student: student('Luis'),
        },
        {
          id: 'e3',
          classroomId: 'c5',
          status: EnrollmentStatusEnum.IN_PROGRESS,
          student: student('Eva'),
        },
      ]),
      findOne: jest.fn().mockResolvedValue({ id: 'e2' }),
    };
    // Ana aprueba, Luis perdió el año completo, Eva va perdiendo sin P2.
    summaryRepository = {
      findAll: jest
        .fn()
        .mockResolvedValue([
          summary('e1', 'p1', 4),
          summary('e1', 'p2', 4),
          summary('e2', 'p1', 2),
          summary('e2', 'p2', 2.5),
          summary('e3', 'p1', 2),
        ]),
    };
    recoveryRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      updateByPk: jest.fn().mockResolvedValue({}),
      deleteByPk: jest.fn().mockResolvedValue({}),
    };

    service = new RecoveriesService(
      yearRepository as unknown as AcademicYearRepository,
      {
        findAll: jest.fn().mockResolvedValue(periods),
      } as unknown as AcademicPeriodRepository,
      classroomSubjectRepository as unknown as ClassroomSubjectRepository,
      enrollmentRepository as unknown as EnrollmentRepository,
      summaryRepository as unknown as PeriodSubjectSummaryRepository,
      recoveryRepository as unknown as SubjectRecoveryRepository,
      {
        findScale: jest.fn().mockResolvedValue(scale),
      } as unknown as GradingScalesService,
    );
  });

  describe('listRecoveries', () => {
    it('lists the failed subjects of the teacher in the active year', async () => {
      const result = await service.listRecoveries(teacher);

      expect(yearRepository.findOne).toHaveBeenCalledWith(
        { organizationId: 'org-id', isActive: true },
        false,
        expect.any(Object),
      );
      expect(classroomSubjectRepository.findAll).toHaveBeenCalledWith(
        { organizationId: 'org-id', teacherId: 'teacher-id' },
        expect.any(Object),
      );
      expect(result.subjects).toHaveLength(1);
      expect(result.subjects[0].students).toEqual([
        expect.objectContaining({
          enrollmentId: 'e2',
          editable: true,
          periodScores: { p1: 2, p2: 2.5 },
          originalScore: 2.3,
          recovery: null,
        }),
      ]);
    });

    it('keeps students that already recovered', async () => {
      recoveryRepository.findAll.mockResolvedValue([
        {
          classroomSubjectId: 'cs-id',
          enrollmentId: 'e2',
          score: 3.5,
          notes: 'Examen',
          updatedAt: new Date(0),
        },
      ]);

      const result = await service.listRecoveries(admin);

      expect(classroomSubjectRepository.findAll).toHaveBeenCalledWith(
        { organizationId: 'org-id' },
        expect.any(Object),
      );
      expect(result.subjects[0].students[0].recovery).toMatchObject({
        score: 3.5,
        notes: 'Examen',
      });
    });

    it('is empty without an active year', async () => {
      yearRepository.findOne.mockResolvedValue(null);

      await expect(service.listRecoveries(admin)).resolves.toMatchObject({
        academicYear: null,
        subjects: [],
      });
    });
  });

  describe('saveRecovery', () => {
    const save = (score: number, notes?: string, actor = teacher) =>
      service.saveRecovery(actor, 'cs-id', 'e2', { score, notes });

    it('records the recovery that replaces the annual score', async () => {
      await expect(save(3.5, '  Examen final  ')).resolves.toEqual({
        annual: expect.objectContaining({
          projected: 3.5,
          status: 'passing',
        }),
        recovery: {
          score: 3.5,
          notes: 'Examen final',
          recordedBy: 'teacher-id',
          originalScore: 2.3,
        },
      });
      expect(recoveryRepository.create).toHaveBeenCalledWith({
        score: 3.5,
        notes: 'Examen final',
        recordedBy: 'teacher-id',
        organizationId: 'org-id',
        classroomSubjectId: 'cs-id',
        enrollmentId: 'e2',
      });
    });

    it('corrects an existing recovery', async () => {
      recoveryRepository.findOne.mockResolvedValue({ id: 'r1' });

      await save(2.8);

      expect(recoveryRepository.updateByPk).toHaveBeenCalledWith('r1', {
        score: 2.8,
        notes: null,
        recordedBy: 'teacher-id',
      });
      expect(recoveryRepository.create).not.toHaveBeenCalled();
    });

    it('only recovers failed subjects with every period graded', async () => {
      summaryRepository.findAll.mockResolvedValue([summary('e2', 'p1', 2)]);

      await expect(save(3.5)).rejects.toThrow(
        new BadRequestException(RECOVERY_NOT_ALLOWED_MESSAGE),
      );

      summaryRepository.findAll.mockResolvedValue([
        summary('e2', 'p1', 4),
        summary('e2', 'p2', 4),
      ]);
      await expect(save(3.5)).rejects.toThrow(
        new BadRequestException(RECOVERY_NOT_ALLOWED_MESSAGE),
      );
    });

    it.each([
      [6, RECOVERY_SCORE_RANGE_MESSAGE('1.0', '5.0')],
      [3.25, RECOVERY_SCORE_DECIMALS_MESSAGE(1)],
    ])('rejects the score %p', async (score, message) => {
      await expect(save(score)).rejects.toThrow(
        new BadRequestException(message),
      );
    });

    it('hides subjects of other teachers', async () => {
      await expect(
        save(3.5, undefined, { ...teacher, userId: 'other-id' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets the admin recover any subject', async () => {
      await save(3.5, undefined, admin);

      expect(recoveryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ recordedBy: 'admin-id' }),
      );
    });

    it('rejects a closed year', async () => {
      classroomSubjectRepository.findOne.mockResolvedValue(
        assignment(AcademicYearStatusEnum.CLOSED),
      );

      await expect(save(3.5)).rejects.toThrow(
        new ConflictException(GRADEBOOK_YEAR_CLOSED_MESSAGE),
      );
    });

    it('requires a student in progress in the classroom', async () => {
      enrollmentRepository.findOne.mockResolvedValue(null);

      await expect(save(3.5)).rejects.toThrow(
        new BadRequestException(RECOVERY_ENROLLMENT_MESSAGE),
      );
      expect(enrollmentRepository.findOne).toHaveBeenCalledWith(
        {
          id: 'e2',
          classroomId: 'c5',
          status: EnrollmentStatusEnum.IN_PROGRESS,
        },
        false,
        expect.any(Object),
      );
    });
  });

  describe('deleteRecovery', () => {
    it('removes the recovery', async () => {
      recoveryRepository.findOne.mockResolvedValue({ id: 'r1' });

      await service.deleteRecovery(teacher, 'cs-id', 'e2');

      expect(recoveryRepository.findOne).toHaveBeenCalledWith(
        { classroomSubjectId: 'cs-id', enrollmentId: 'e2' },
        true,
        expect.any(Object),
      );
      expect(recoveryRepository.deleteByPk).toHaveBeenCalledWith('r1');
    });
  });
});
