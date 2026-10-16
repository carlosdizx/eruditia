import 'reflect-metadata';
import {
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import PermissionEnum from '@common/enums/permission.enum';
import { hashPassword } from '@common/utils/password.util';
import ReportCardsService, {
  LOOKUP_WINDOW_MS,
  MAX_FAILED_LOOKUPS,
} from '../../src/report-cards/report-cards.service';
import AcademicPeriodRepository from '../../src/academic-years/repositories/academic-period.repository';
import ClassroomSubjectRepository from '../../src/classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../../src/enrollments/enrollment.repository';
import EvaluationItemRepository from '../../src/gradebooks/repositories/evaluation-item.repository';
import PeriodSubjectSummaryRepository from '../../src/gradebooks/repositories/period-subject-summary.repository';
import StudentGradeRepository from '../../src/gradebooks/repositories/student-grade.repository';
import GradingScalesService from '../../src/grading-scales/grading-scales.service';
import OrganizationRepository from '../../src/organizations/organization.repository';
import PermissionsService from '../../src/permissions/services/permissions.service';
import StudentRepository from '../../src/students/student.repository';
import {
  INVALID_ACCESS_PIN_MESSAGE,
  REPORT_CARD_YEAR_NOT_FOUND_MESSAGE,
  STUDENT_PROFILE_NOT_FOUND_MESSAGE,
} from '../../src/report-cards/constants/report-card-messages.constant';

type Mocked = Record<string, jest.Mock>;

describe('ReportCardsService', () => {
  let organizationRepository: Mocked;
  let studentRepository: Mocked;
  let enrollmentRepository: Mocked;
  let summaryRepository: Mocked;
  let classroomSubjectRepository: Mocked;
  let permissionsService: Mocked;
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
      classroom: { id: 'c5', name: '5°A', gradeLevel: { name: 'Quinto' } },
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
    summaryRepository = {
      findAll: jest.fn().mockResolvedValue([
        {
          classroomSubjectId: 'math',
          academicPeriodId: 'p1',
          finalPeriodScore: 4,
          teacherObservation: 'Muy bien',
        },
        {
          classroomSubjectId: 'art',
          academicPeriodId: 'p1',
          finalPeriodScore: 2.5,
          teacherObservation: null,
        },
      ]),
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
      {
        findAll: jest.fn().mockResolvedValue(periods),
      } as unknown as AcademicPeriodRepository,
      classroomSubjectRepository as unknown as ClassroomSubjectRepository,
      summaryRepository as unknown as PeriodSubjectSummaryRepository,
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
          .mockResolvedValue([{ evaluationItemId: 'i1', score: 4 }]),
      } as unknown as StudentGradeRepository,
      {
        findScale: jest.fn().mockResolvedValue(scale),
      } as unknown as GradingScalesService,
      permissionsService as unknown as PermissionsService,
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
      });
      expect(card.subjects[0]).toMatchObject({
        id: 'math',
        teacher: { firstName: 'Rosa', lastName: 'Gil' },
        periods: {
          p1: {
            score: 4,
            observation: 'Muy bien',
            activities: [{ title: 'Examen', weightPercentage: 100, score: 4 }],
          },
          p2: { score: null, observation: null, activities: [] },
        },
        annual: { accumulated: 2, projected: 4, status: 'passing' },
      });
      expect(card.subjects[1].annual).toMatchObject({ status: 'at_risk' });
      // (4 × 2 + 2.5 × 1) / 3
      expect(card.averages).toEqual({
        periods: { p1: 3.5, p2: null },
        general: 3.5,
      });
    });

    it('opens a previous year on demand', async () => {
      await service.getOwnReportCard(actor, 'y2025');

      expect(summaryRepository.findAll).toHaveBeenCalledWith(
        { enrollmentId: 'e2025' },
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
