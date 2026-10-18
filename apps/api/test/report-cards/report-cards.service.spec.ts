import 'reflect-metadata';
import {
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { hashPassword } from '@common/utils/password.util';
import ReportCardsService, {
  LOOKUP_WINDOW_MS,
  MAX_FAILED_LOOKUPS,
} from '../../src/report-cards/report-cards.service';
import AcademicPeriodRepository from '../../src/academic-years/repositories/academic-period.repository';
import AnnualResultsService from '../../src/gradebooks/annual-results.service';
import SubjectRecoveryRepository from '../../src/gradebooks/repositories/subject-recovery.repository';
import ClassroomSubjectRepository from '../../src/classroom-subjects/classroom-subject.repository';
import ClassroomRepository from '../../src/classrooms/classroom.repository';
import EnrollmentRepository from '../../src/enrollments/enrollment.repository';
import EvaluationItemRepository from '../../src/gradebooks/repositories/evaluation-item.repository';
import PeriodSubjectSummaryRepository from '../../src/gradebooks/repositories/period-subject-summary.repository';
import StudentGradeRepository from '../../src/gradebooks/repositories/student-grade.repository';
import SubjectPeriodConceptRepository from '../../src/gradebooks/repositories/subject-period-concept.repository';
import GradingScalesService from '../../src/grading-scales/grading-scales.service';
import OrganizationRepository from '../../src/organizations/organization.repository';
import PermissionsService from '../../src/permissions/services/permissions.service';
import RankingsService from '../../src/rankings/rankings.service';
import StudentRepository from '../../src/students/student.repository';
import {
  INVALID_ACCESS_PIN_MESSAGE,
  REPORT_CARD_CLASSROOM_NOT_FOUND_MESSAGE,
  REPORT_CARD_NOT_FOUND_MESSAGE,
  REPORT_CARD_PERIOD_NOT_FOUND_MESSAGE,
  REPORT_CARD_YEAR_NOT_FOUND_MESSAGE,
  STUDENT_PROFILE_NOT_FOUND_MESSAGE,
} from '../../src/report-cards/constants/report-card-messages.constant';

type Mocked = Record<string, jest.Mock>;

describe('ReportCardsService', () => {
  let organizationRepository: Mocked;
  let studentRepository: Mocked;
  let enrollmentRepository: Mocked;
  let classroomRepository: Mocked;
  let summaryRepository: Mocked;
  let classroomSubjectRepository: Mocked;
  let permissionsService: Mocked;
  let rankingsService: Mocked;
  let findScale: jest.Mock;
  let cacheStore: Map<string, unknown>;
  let cache: Mocked;
  let service: ReportCardsService;

  const scale = {
    minScore: 1,
    maxScore: 5,
    passingScore: 3,
    decimalPlaces: 1,
    isDefault: false,
  };
  const organization = {
    id: 'org-id',
    name: 'Colegio Sol',
    slug: 'sol',
    logoUrl: null,
  };
  const student = {
    id: 'student-id',
    firstName: 'Ana',
    lastName: 'Pérez',
    documentType: 'TI',
    documentNumber: '1001',
    studentCode: 'E-1',
  };
  const year2026 = {
    id: 'y2026',
    name: '2026',
    status: 'open',
    startDate: '2026-01-15',
  };
  const year2025 = { ...year2026, id: 'y2025', name: '2025' };
  const enrollments = [
    {
      id: 'e2026',
      status: 'in_progress',
      academicYearId: 'y2026',
      classroomId: 'c5',
      academicYear: year2026,
      classroom: {
        id: 'c5',
        name: '5°A',
        homeroomTeacherId: 'homeroom-id',
        gradeLevel: { name: 'Quinto' },
      },
    },
    {
      id: 'e2025',
      status: 'promoted',
      academicYearId: 'y2025',
      classroomId: 'c4',
      academicYear: year2025,
      classroom: { id: 'c4', name: '4°A', gradeLevel: { name: 'Cuarto' } },
    },
  ];
  const periods = [
    { id: 'p1', name: 'P1', orderIndex: 1, weightPercentage: 50 },
    { id: 'p2', name: 'P2', orderIndex: 2, weightPercentage: 50 },
  ];
  const assignments = [
    {
      id: 'math',
      weightInGpa: 2,
      subject: { id: 's-math', name: 'Matemáticas', areaName: null },
      teacher: { id: 't1', firstName: 'Rosa', lastName: 'Gil' },
    },
    {
      id: 'art',
      weightInGpa: 1,
      subject: { id: 's-art', name: 'Artes', areaName: null },
      teacher: null,
    },
  ];

  beforeEach(() => {
    organizationRepository = {
      findOne: jest.fn().mockResolvedValue(organization),
      findByPk: jest.fn().mockResolvedValue(organization),
    };
    studentRepository = { findOne: jest.fn().mockResolvedValue(student) };
    enrollmentRepository = {
      findAll: jest.fn().mockResolvedValue(enrollments),
    };
    classroomSubjectRepository = {
      findAll: jest.fn().mockResolvedValue(assignments),
    };
    classroomRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'c5',
        name: '5°A',
        academicYearId: 'y2026',
        homeroomTeacherId: 'homeroom-id',
        academicYear: year2026,
        gradeLevel: { name: 'Quinto' },
        homeroomTeacher: { firstName: 'Luz', lastName: 'Mora' },
      }),
    };
    summaryRepository = {
      findAll: jest.fn().mockResolvedValue([
        {
          enrollmentId: 'e2026',
          classroomSubjectId: 'math',
          academicPeriodId: 'p1',
          finalPeriodScore: 4,
          teacherObservation: 'Muy bien',
        },
        {
          enrollmentId: 'e2026',
          classroomSubjectId: 'art',
          academicPeriodId: 'p1',
          finalPeriodScore: 2.5,
          teacherObservation: null,
        },
      ]),
    };
    findScale = jest.fn().mockResolvedValue(scale);
    rankingsService = {
      classroomPositions: jest.fn().mockResolvedValue(() => ({
        annual: { position: 2, total: 28 },
        periods: { p1: { position: 1, total: 28 }, p2: null },
      })),
    };
    permissionsService = {
      getEffectivePermissions: jest
        .fn()
        .mockResolvedValue([PermissionEnum.REPORT_CARD_VIEW]),
    };
    cacheStore = new Map();
    cache = {
      get: jest.fn((key: string) => Promise.resolve(cacheStore.get(key))),
      set: jest.fn((key: string, value: unknown) => {
        cacheStore.set(key, value);
        return Promise.resolve(value);
      }),
      del: jest.fn((key: string) => Promise.resolve(cacheStore.delete(key))),
    };

    service = new ReportCardsService(
      organizationRepository as unknown as OrganizationRepository,
      studentRepository as unknown as StudentRepository,
      enrollmentRepository as unknown as EnrollmentRepository,
      classroomRepository as unknown as ClassroomRepository,
      {
        findAll: jest.fn().mockResolvedValue(periods),
      } as unknown as AcademicPeriodRepository,
      new AnnualResultsService(
        {
          findAll: jest.fn().mockResolvedValue(periods),
        } as unknown as AcademicPeriodRepository,
        classroomSubjectRepository as unknown as ClassroomSubjectRepository,
        summaryRepository as unknown as PeriodSubjectSummaryRepository,
        {
          findAll: jest.fn().mockResolvedValue([]),
        } as unknown as SubjectRecoveryRepository,
      ),
      {
        findAll: jest.fn().mockResolvedValue([
          {
            id: 'i1',
            classroomSubjectId: 'math',
            academicPeriodId: 'p1',
            title: 'Examen',
            weightPercentage: 100,
          },
        ]),
      } as unknown as EvaluationItemRepository,
      {
        findAll: jest
          .fn()
          .mockResolvedValue([
            { enrollmentId: 'e2026', evaluationItemId: 'i1', score: 4 },
          ]),
      } as unknown as StudentGradeRepository,
      {
        findAll: jest.fn().mockResolvedValue([
          {
            classroomSubjectId: 'math',
            academicPeriodId: 'p1',
            minScore: 3.5,
            maxScore: 5,
            conceptText: 'Superó los logros',
          },
          {
            classroomSubjectId: 'art',
            academicPeriodId: 'p1',
            minScore: 3,
            maxScore: 5,
            conceptText: 'Aprobó',
          },
        ]),
      } as unknown as SubjectPeriodConceptRepository,
      { findScale } as unknown as GradingScalesService,
      permissionsService as unknown as PermissionsService,
      rankingsService as unknown as RankingsService,
      cache as unknown as Cache,
    );
  });

  describe('getOwnReportCard', () => {
    const actor = { organizationId: 'org-id', userId: 'user-id' };

    it('builds the latest year with every subject, activity and average', async () => {
      const result = await service.getOwnReportCard(actor);

      expect(studentRepository.findOne).toHaveBeenCalledWith(
        { userId: 'user-id', organizationId: 'org-id' },
        false,
        expect.any(Object),
      );
      expect(result.years).toEqual([
        { id: 'y2026', name: '2026', status: 'open' },
        { id: 'y2025', name: '2025', status: 'open' },
      ]);
      expect(classroomSubjectRepository.findAll).toHaveBeenCalledWith(
        { classroomId: 'c5' },
        expect.any(Object),
      );

      const card = result.reportCard!;
      expect(card.classroom).toEqual({
        name: '5°A',
        gradeLevel: { name: 'Quinto' },
        homeroomTeacher: null,
      });
      expect(card.subjects[0]).toMatchObject({
        id: 'math',
        teacher: { firstName: 'Rosa', lastName: 'Gil' },
        periods: {
          p1: {
            score: 4,
            observation: 'Muy bien',
            concept: 'Superó los logros',
            activities: [{ title: 'Examen', weightPercentage: 100, score: 4 }],
          },
          p2: {
            score: null,
            observation: null,
            concept: null,
            activities: [],
          },
        },
        annual: { accumulated: 2, projected: 4, status: 'passing' },
      });
      // 2.5 cae fuera del único rango de Artes.
      expect(card.subjects[1].periods.p1.concept).toBeNull();
      expect(card.subjects[1].annual).toMatchObject({ status: 'at_risk' });
      // (4 × 2 + 2.5 × 1) / 3
      expect(card.averages).toEqual({
        periods: { p1: 3.5, p2: null },
        general: 3.5,
      });
    });

    it('hides the classroom position unless the school publishes it', async () => {
      const hidden = await service.getOwnReportCard(actor);
      expect(hidden.reportCard!.rank).toBeNull();
      expect(rankingsService.classroomPositions).not.toHaveBeenCalled();

      findScale.mockResolvedValue({ ...scale, showRankInReportCard: true });
      const shown = await service.getOwnReportCard(actor);

      expect(shown.reportCard!.rank).toEqual({
        annual: { position: 2, total: 28 },
        periods: { p1: { position: 1, total: 28 }, p2: null },
      });
      expect(rankingsService.classroomPositions).toHaveBeenCalledWith(
        'org-id',
        { id: 'c5', academicYearId: 'y2026' },
      );
    });

    it('opens a previous year on demand', async () => {
      await service.getOwnReportCard(actor, 'y2025');

      expect(summaryRepository.findAll).toHaveBeenCalledWith(
        { enrollmentId: ['e2025'], classroomSubjectId: ['math', 'art'] },
        expect.any(Object),
      );
    });

    it('rejects a year without enrollment', async () => {
      await expect(service.getOwnReportCard(actor, 'y2020')).rejects.toThrow(
        REPORT_CARD_YEAR_NOT_FOUND_MESSAGE,
      );
    });

    it('has no report card without enrollments', async () => {
      enrollmentRepository.findAll.mockResolvedValue([]);

      await expect(service.getOwnReportCard(actor)).resolves.toMatchObject({
        years: [],
        reportCard: null,
      });
    });

    it('requires an account linked to a student', async () => {
      studentRepository.findOne.mockResolvedValue(null);

      await expect(service.getOwnReportCard(actor)).rejects.toThrow(
        STUDENT_PROFILE_NOT_FOUND_MESSAGE,
      );
    });
  });

  describe('getEnrollmentReportCard', () => {
    const admin = {
      organizationId: 'org-id',
      userId: 'admin-id',
      roleName: RoleNameEnum.ADMIN,
    };
    const teacher = {
      ...admin,
      userId: 'homeroom-id',
      roleName: RoleNameEnum.TEACHER,
    };

    beforeEach(() => {
      enrollmentRepository.findOne = jest.fn((query: { id: string }) =>
        Promise.resolve(
          query.id === 'missing'
            ? null
            : {
                id: query.id,
                student,
                classroom: enrollments.find(({ id }) => id === query.id)
                  ?.classroom,
              },
        ),
      );
    });

    it('opens any enrollment of the organization for the admin', async () => {
      const result = await service.getEnrollmentReportCard(admin, 'e2025');

      expect(enrollmentRepository.findOne).toHaveBeenCalledWith(
        { id: 'e2025', organizationId: 'org-id' },
        false,
        expect.any(Object),
      );
      expect(result.reportCard!.classroom.name).toBe('4°A');
      expect(result.years).toEqual([
        { id: 'y2026', name: '2026', status: 'open', enrollmentId: 'e2026' },
        { id: 'y2025', name: '2025', status: 'open', enrollmentId: 'e2025' },
      ]);
    });

    it('lets the homeroom teacher open only their classroom', async () => {
      const result = await service.getEnrollmentReportCard(teacher, 'e2026');

      expect(result.years.map(({ id }) => id)).toEqual(['y2026']);
      await expect(
        service.getEnrollmentReportCard(teacher, 'e2025'),
      ).rejects.toThrow(new NotFoundException(REPORT_CARD_NOT_FOUND_MESSAGE));
    });

    it('is not found for another organization', async () => {
      await expect(
        service.getEnrollmentReportCard(admin, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('PDF', () => {
    const admin = {
      organizationId: 'org-id',
      userId: 'admin-id',
      roleName: RoleNameEnum.ADMIN,
    };
    const isPdf = (content: Buffer) =>
      content.subarray(0, 5).toString() === '%PDF-';

    it("renders the student's own report card", async () => {
      const result = await service.getOwnReportCardPdf(
        { organizationId: 'org-id', userId: 'user-id' },
        { periodId: 'p1' },
      );

      expect(result.filename).toBe('boletin-perez-ana-2026-p1.pdf');
      expect(isPdf(result.content)).toBe(true);
    });

    it('rejects a period from another year', async () => {
      await expect(
        service.getOwnReportCardPdf(
          { organizationId: 'org-id', userId: 'user-id' },
          { periodId: 'other' },
        ),
      ).rejects.toThrow(REPORT_CARD_PERIOD_NOT_FOUND_MESSAGE);
    });

    it('prints every student of the classroom in one file', async () => {
      enrollmentRepository.findAll.mockResolvedValue([
        { id: 'e2026', status: 'in_progress', student },
        {
          id: 'e-luis',
          status: 'in_progress',
          student: { ...student, id: 's2', firstName: 'Luis' },
        },
      ]);

      const result = await service.getClassroomReportCardsPdf(admin, 'c5');

      expect(enrollmentRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ classroomId: 'c5' }),
        expect.any(Object),
      );
      // Una sola consulta de notas para todo el salón.
      expect(summaryRepository.findAll).toHaveBeenCalledTimes(1);
      expect(summaryRepository.findAll).toHaveBeenCalledWith(
        {
          enrollmentId: ['e2026', 'e-luis'],
          classroomSubjectId: ['math', 'art'],
        },
        expect.any(Object),
      );
      expect(result.filename).toBe('boletines-5-a-2026.pdf');
      expect(isPdf(result.content)).toBe(true);
    });

    it('lists the periods of the classroom year', async () => {
      await expect(service.listClassroomPeriods(admin, 'c5')).resolves.toBe(
        periods,
      );
    });

    it("hides another teacher's classroom", async () => {
      await expect(
        service.getClassroomReportCardsPdf(
          { ...admin, userId: 'other', roleName: RoleNameEnum.TEACHER },
          'c5',
        ),
      ).rejects.toThrow(REPORT_CARD_CLASSROOM_NOT_FOUND_MESSAGE);
    });

    it('needs an enrollment to print', async () => {
      enrollmentRepository.findAll.mockResolvedValue([]);

      await expect(
        service.getOwnReportCardPdf(
          { organizationId: 'org-id', userId: 'user-id' },
          {},
        ),
      ).rejects.toThrow(REPORT_CARD_NOT_FOUND_MESSAGE);
    });
  });

  describe('public portal', () => {
    it('shows only the public data of the school', async () => {
      await expect(service.getPublicPortal('SOL')).resolves.toEqual({
        name: 'Colegio Sol',
        slug: 'sol',
        logoUrl: null,
      });
      expect(organizationRepository.findOne).toHaveBeenCalledWith(
        { slug: 'sol', isActive: true },
        false,
        expect.any(Object),
      );
    });

    it.each([
      ['an unknown school', null, [PermissionEnum.REPORT_CARD_VIEW]],
      ['a school without the permission', organization, []],
    ])('is not found for %s', async (_, found, permissions) => {
      organizationRepository.findOne.mockResolvedValue(found);
      permissionsService.getEffectivePermissions.mockResolvedValue(permissions);

      await expect(service.getPublicPortal('sol')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('lookupReportCard', () => {
    const key = 'report-card-lookup:org-id:1001';

    beforeEach(async () => {
      studentRepository.findOne.mockResolvedValue({
        ...student,
        accessPin: await hashPassword('123456'),
      });
    });

    it('returns the report card with the right PIN and clears failures', async () => {
      cacheStore.set(key, 2);

      const result = await service.lookupReportCard('sol', {
        documentNumber: '1001',
        accessPin: '123456',
      });

      expect(studentRepository.findOne).toHaveBeenCalledWith(
        { organizationId: 'org-id', documentNumber: '1001' },
        false,
        expect.any(Object),
      );
      expect(result.student).not.toHaveProperty('accessPin');
      expect(result.reportCard).not.toBeNull();
      expect(cacheStore.has(key)).toBe(false);
    });

    it('counts a wrong PIN as a failure', async () => {
      await expect(
        service.lookupReportCard('sol', {
          documentNumber: '1001',
          accessPin: '654321',
        }),
      ).rejects.toThrow(new UnauthorizedException(INVALID_ACCESS_PIN_MESSAGE));
      expect(cache.set).toHaveBeenCalledWith(key, 1, LOOKUP_WINDOW_MS);
    });

    it.each([
      ['an unknown document', null],
      ['a student with an account', { ...student, accessPin: null }],
    ])('answers the same for %s', async (_, found) => {
      studentRepository.findOne.mockResolvedValue(found);

      await expect(
        service.lookupReportCard('sol', {
          documentNumber: '1001',
          accessPin: '000000',
        }),
      ).rejects.toThrow(INVALID_ACCESS_PIN_MESSAGE);
    });

    it('locks the document after too many failures', async () => {
      cacheStore.set(key, MAX_FAILED_LOOKUPS);

      const error = await service
        .lookupReportCard('sol', {
          documentNumber: '1001',
          accessPin: '123456',
        })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect(studentRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
