import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import RankingsService from '../../src/rankings/rankings.service';
import AcademicPeriodRepository from '../../src/academic-years/repositories/academic-period.repository';
import AcademicYearRepository from '../../src/academic-years/repositories/academic-year.repository';
import ClassroomRepository from '../../src/classrooms/classroom.repository';
import ClassroomSubjectRepository from '../../src/classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../../src/enrollments/enrollment.repository';
import GradingScalesService from '../../src/grading-scales/grading-scales.service';
import PeriodSubjectSummaryRepository from '../../src/gradebooks/repositories/period-subject-summary.repository';
import SubjectRecoveryRepository from '../../src/gradebooks/repositories/subject-recovery.repository';
import {
  RANKING_CLASSROOM_NOT_FOUND_MESSAGE,
  RANKING_PERIOD_NOT_FOUND_MESSAGE,
} from '../../src/rankings/constants/ranking-messages.constant';

type Mocked = Record<string, jest.Mock>;
type Query = Record<string, unknown>;

describe('RankingsService', () => {
  let yearRepository: Mocked;
  let periodRepository: Mocked;
  let classroomRepository: Mocked;
  let classroomSubjectRepository: Mocked;
  let enrollmentRepository: Mocked;
  let summaryRepository: Mocked;
  let recoveryRepository: Mocked;
  let service: RankingsService;

  const admin = {
    organizationId: 'org-id',
    userId: 'admin-id',
    roleName: RoleNameEnum.ADMIN,
  };
  const teacher = (userId: string) => ({
    ...admin,
    userId,
    roleName: RoleNameEnum.TEACHER,
  });
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
    { id: 'p1', weightPercentage: 50 },
    { id: 'p2', weightPercentage: 50 },
  ];
  const classrooms = [
    {
      id: 'c5a',
      name: '5°A',
      gradeLevelId: 'g5',
      homeroomTeacherId: 'homeroom-id',
      gradeLevel: { id: 'g5', name: 'Quinto', sequenceOrder: 5 },
    },
    {
      id: 'c5b',
      name: '5°B',
      gradeLevelId: 'g5',
      homeroomTeacherId: 'other-id',
      gradeLevel: { id: 'g5', name: 'Quinto', sequenceOrder: 5 },
    },
  ];
  const assignment = (
    id: string,
    classroomId: string,
    subjectId: string,
    teacherId: string,
    weightInGpa = 1,
  ) => ({
    id,
    classroomId,
    subjectId,
    teacherId,
    weightInGpa,
    subject: {
      id: subjectId,
      name: subjectId === 'math' ? 'Matemáticas' : 'Artes',
    },
  });
  const assignments = [
    assignment('a-math', 'c5a', 'math', 'math-teacher', 2),
    assignment('a-art', 'c5a', 'art', 'art-teacher'),
    assignment('b-math', 'c5b', 'math', 'math-teacher', 2),
  ];
  const enrollment = (id: string, classroomId: string, lastName: string) => ({
    id,
    classroomId,
    status: EnrollmentStatusEnum.IN_PROGRESS,
    student: { id: `s-${id}`, firstName: 'A', lastName },
  });
  const summary = (
    enrollmentId: string,
    classroomSubjectId: string,
    academicPeriodId: string,
    finalPeriodScore: number,
  ) => ({
    enrollmentId,
    classroomSubjectId,
    academicPeriodId,
    finalPeriodScore,
  });

  beforeEach(() => {
    yearRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'y2026',
        name: '2026',
        status: 'open',
      }),
    };
    periodRepository = {
      findAll: jest.fn().mockResolvedValue(periods),
      findOne: jest.fn((query: Query) =>
        Promise.resolve(periods.find(({ id }) => id === query.id) ?? null),
      ),
    };
    classroomRepository = {
      findAll: jest.fn((query: Query) =>
        Promise.resolve(
          classrooms.filter(({ id }) => !query.id || id === query.id),
        ),
      ),
    };
    classroomSubjectRepository = {
      findAll: jest.fn((query: Query) =>
        Promise.resolve(
          assignments.filter(({ classroomId }) =>
            (query.classroomId as string[]).includes(classroomId),
          ),
        ),
      ),
    };
    enrollmentRepository = {
      findAll: jest.fn((query: Query) =>
        Promise.resolve(
          [
            enrollment('e1', 'c5a', 'Arias'),
            enrollment('e2', 'c5a', 'Gil'),
            enrollment('e3', 'c5a', 'Ruiz'),
            enrollment('e4', 'c5b', 'Paz'),
          ].filter(({ classroomId }) =>
            (query.classroomId as string[]).includes(classroomId),
          ),
        ),
      ),
    };
    // Arias: Mat 4 / 4, Artes 2 / 2 (pierde Artes).
    // Gil: Mat 3.5 / 3.5, Artes 4 / 4. Ruiz: Mat 3.5 / 3.5, Artes 4 / 4.
    // Paz (5°B): Mat 5 / 5.
    summaryRepository = {
      findAll: jest.fn((query: Query) =>
        Promise.resolve(
          [
            summary('e1', 'a-math', 'p1', 4),
            summary('e1', 'a-math', 'p2', 4),
            summary('e1', 'a-art', 'p1', 2),
            summary('e1', 'a-art', 'p2', 2),
            summary('e2', 'a-math', 'p1', 3.5),
            summary('e2', 'a-math', 'p2', 3.5),
            summary('e2', 'a-art', 'p1', 4),
            summary('e2', 'a-art', 'p2', 4),
            summary('e3', 'a-math', 'p1', 3.5),
            summary('e3', 'a-math', 'p2', 3.5),
            summary('e3', 'a-art', 'p1', 4),
            summary('e3', 'a-art', 'p2', 4),
            summary('e4', 'b-math', 'p1', 5),
            summary('e4', 'b-math', 'p2', 5),
          ].filter(
            ({ academicPeriodId }) =>
              !query.academicPeriodId ||
              academicPeriodId === query.academicPeriodId,
          ),
        ),
      ),
    };
    recoveryRepository = { findAll: jest.fn().mockResolvedValue([]) };

    service = new RankingsService(
      yearRepository as unknown as AcademicYearRepository,
      periodRepository as unknown as AcademicPeriodRepository,
      classroomRepository as unknown as ClassroomRepository,
      classroomSubjectRepository as unknown as ClassroomSubjectRepository,
      enrollmentRepository as unknown as EnrollmentRepository,
      summaryRepository as unknown as PeriodSubjectSummaryRepository,
      recoveryRepository as unknown as SubjectRecoveryRepository,
      {
        findScale: jest.fn().mockResolvedValue(scale),
      } as unknown as GradingScalesService,
    );
  });

  const rows = (result: Awaited<ReturnType<RankingsService['getRanking']>>) =>
    result.rows.map(({ position, student, score, failedSubjects }) => [
      position,
      student.lastName,
      score,
      failedSubjects,
    ]);

  describe('getRanking', () => {
    it('ranks a classroom by the annual general average', async () => {
      const result = await service.getRanking(admin, { classroomId: 'c5a' });

      expect(yearRepository.findOne).toHaveBeenCalledWith(
        { organizationId: 'org-id', isActive: true },
        false,
        expect.any(Object),
      );
      expect(enrollmentRepository.findAll).toHaveBeenCalledWith(
        {
          classroomId: ['c5a'],
          status: [
            EnrollmentStatusEnum.IN_PROGRESS,
            EnrollmentStatusEnum.PROMOTED,
            EnrollmentStatusEnum.FAILED,
            EnrollmentStatusEnum.GRADUATED,
          ],
        },
        expect.any(Object),
      );
      expect(result.scope.classroom).toEqual({ id: 'c5a', name: '5°A' });
      // Gil y Ruiz: (3.5 × 2 + 4) / 3 = 3.67; Arias: (4 × 2 + 2) / 3 = 3.33
      // pero perdió Artes, así que va después.
      expect(rows(result)).toEqual([
        [1, 'Gil', 3.7, 0],
        [1, 'Ruiz', 3.7, 0],
        [3, 'Arias', 3.3, 1],
      ]);
      expect(result.total).toBe(3);
    });

    it('excludes students with failed subjects on demand', async () => {
      const result = await service.getRanking(admin, {
        classroomId: 'c5a',
        onlyAllPassed: true,
      });

      expect(rows(result).map(([, name]) => name)).toEqual(['Gil', 'Ruiz']);
      expect(result.total).toBe(2);
    });

    it('ranks a single period', async () => {
      summaryRepository.findAll.mockResolvedValue([
        summary('e1', 'a-math', 'p2', 5),
        summary('e2', 'a-math', 'p2', 3),
      ]);

      const result = await service.getRanking(admin, {
        classroomId: 'c5a',
        periodId: 'p2',
      });

      expect(summaryRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ academicPeriodId: 'p2' }),
        expect.any(Object),
      );
      expect(recoveryRepository.findAll).not.toHaveBeenCalled();
      expect(rows(result)).toEqual([
        [1, 'Arias', 5, 0],
        [2, 'Gil', 3, 0],
      ]);
    });

    it('uses the recovery in the annual ranking', async () => {
      recoveryRepository.findAll.mockResolvedValue([
        { enrollmentId: 'e1', classroomSubjectId: 'a-art', score: 5 },
      ]);

      const result = await service.getRanking(admin, { classroomId: 'c5a' });

      // Arias: (4 × 2 + 5) / 3 = 4.33 sin materias perdidas.
      expect(rows(result)[0]).toEqual([1, 'Arias', 4.3, 0]);
    });

    it('ranks a subject across the whole grade', async () => {
      const result = await service.getRanking(admin, {
        gradeLevelId: 'g5',
        subjectId: 'math',
      });

      expect(classroomRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ gradeLevelId: 'g5' }),
        expect.any(Object),
      );
      expect(result.scope.subject).toEqual({ id: 'math', name: 'Matemáticas' });
      expect(rows(result)).toEqual([
        [1, 'Paz', 5, 0],
        [2, 'Arias', 4, 1],
        [3, 'Gil', 3.5, 0],
        [3, 'Ruiz', 3.5, 0],
      ]);
    });

    it('keeps the ties of the last position in the top N', async () => {
      const result = await service.getRanking(admin, {
        gradeLevelId: 'g5',
        subjectId: 'math',
        limit: 3,
      });

      expect(result.rows).toHaveLength(4);
      expect(result.total).toBe(4);
    });

    it('lets the homeroom teacher rank only the classroom they direct', async () => {
      const homeroom = teacher('homeroom-id');

      await expect(
        service.getRanking(homeroom, { classroomId: 'c5a' }),
      ).resolves.toMatchObject({ total: 3 });
      await expect(
        service.getRanking(homeroom, { classroomId: 'c5b' }),
      ).rejects.toThrow(
        new NotFoundException(RANKING_CLASSROOM_NOT_FOUND_MESSAGE),
      );
    });

    it('lets a teacher rank the subjects they teach', async () => {
      const result = await service.getRanking(teacher('math-teacher'), {
        gradeLevelId: 'g5',
        subjectId: 'math',
      });
      expect(result.total).toBe(4);

      await expect(
        service.getRanking(teacher('math-teacher'), { classroomId: 'c5a' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.getRanking(teacher('art-teacher'), {
          gradeLevelId: 'g5',
          subjectId: 'math',
        }),
      ).resolves.toMatchObject({ total: 0, rows: [] });
    });

    it('rejects a period from another year', async () => {
      await expect(
        service.getRanking(admin, { periodId: 'other' }),
      ).rejects.toThrow(
        new NotFoundException(RANKING_PERIOD_NOT_FOUND_MESSAGE),
      );
    });

    it('is empty without an active year', async () => {
      yearRepository.findOne.mockResolvedValue(null);

      await expect(service.getRanking(admin, {})).resolves.toMatchObject({
        academicYear: null,
        rows: [],
      });
    });
  });

  describe('getSubjectLeaders', () => {
    it('lists the best student of each subject of the classroom', async () => {
      const result = await service.getSubjectLeaders(admin, {
        classroomId: 'c5a',
      });

      expect(result.classroom).toEqual({ id: 'c5a', name: '5°A' });
      expect(
        result.subjects.map(({ subject, graded, leaders }) => [
          subject.name,
          graded,
          leaders.map(({ student, score }) => [student.lastName, score]),
        ]),
      ).toEqual([
        ['Matemáticas', 3, [['Arias', 4]]],
        // Gil y Ruiz empatan en Artes.
        [
          'Artes',
          3,
          [
            ['Gil', 4],
            ['Ruiz', 4],
          ],
        ],
      ]);
    });

    it('shows the teacher only the subjects they can see', async () => {
      const result = await service.getSubjectLeaders(teacher('art-teacher'), {
        classroomId: 'c5a',
      });

      expect(result.subjects.map(({ subject }) => subject.name)).toEqual([
        'Artes',
      ]);
      await expect(
        service.getSubjectLeaders(teacher('art-teacher'), {
          classroomId: 'c5b',
        }),
      ).rejects.toThrow(
        new NotFoundException(RANKING_CLASSROOM_NOT_FOUND_MESSAGE),
      );
    });
  });

  describe('getHonorRoll', () => {
    it('lists the top of each classroom', async () => {
      const result = await service.getHonorRoll(admin, { limit: 1 });

      expect(
        result.groups.map(({ id, name, total, rows: top }) => [
          id,
          name,
          total,
          top.map(({ student, position }) => [position, student.lastName]),
        ]),
      ).toEqual([
        [
          'c5a',
          '5°A',
          3,
          [
            [1, 'Gil'],
            [1, 'Ruiz'],
          ],
        ],
        ['c5b', '5°B', 1, [[1, 'Paz']]],
      ]);
    });

    it('groups the whole grade and excludes failed subjects', async () => {
      const result = await service.getHonorRoll(admin, {
        groupBy: 'gradeLevel',
        onlyAllPassed: true,
      });

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0]).toMatchObject({ id: 'g5', name: 'Quinto' });
      // Arias perdió Artes; Paz (5 en Matemáticas) va primero.
      expect(
        result.groups[0].rows.map(({ position, student }) => [
          position,
          student.lastName,
        ]),
      ).toEqual([
        [1, 'Paz'],
        [2, 'Gil'],
        [2, 'Ruiz'],
      ]);
    });

    it('shows the homeroom teacher only their classroom', async () => {
      const result = await service.getHonorRoll(teacher('homeroom-id'), {});

      expect(result.groups.map(({ id }) => id)).toEqual(['c5a']);
    });
  });

  describe('classroomPositions', () => {
    it('returns the annual and per-period positions in the classroom', async () => {
      const positionsOf = await service.classroomPositions('org-id', {
        id: 'c5a',
        academicYearId: 'y2026',
      });
      const positions = positionsOf('e1');

      expect(positions.annual).toEqual({ position: 3, total: 3 });
      expect(Object.keys(positions.periods)).toEqual(
        periods.map(({ id }) => id),
      );
      expect(positionsOf('unknown')).toMatchObject({ annual: null });
    });
  });

  describe('getOptions', () => {
    it('lists everything for the admin', async () => {
      const result = await service.getOptions(admin);

      expect(result.classrooms).toEqual([
        expect.objectContaining({
          id: 'c5a',
          general: true,
          subjectIds: ['math', 'art'],
        }),
        expect.objectContaining({
          id: 'c5b',
          general: true,
          subjectIds: ['math'],
        }),
      ]);
      expect(result.subjects.map(({ name }) => name)).toEqual([
        'Artes',
        'Matemáticas',
      ]);
    });

    it('limits the teacher to their homerooms and subjects', async () => {
      const result = await service.getOptions(teacher('art-teacher'));

      expect(result.classrooms).toEqual([
        expect.objectContaining({
          id: 'c5a',
          general: false,
          subjectIds: ['art'],
        }),
      ]);
      expect(result.subjects).toEqual([{ id: 'art', name: 'Artes' }]);
    });
  });
});
