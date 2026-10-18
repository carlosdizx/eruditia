import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import GradebooksService from '../../src/gradebooks/gradebooks.service';
import SubjectConceptsService from '../../src/gradebooks/subject-concepts.service';
import AcademicPeriodRepository from '../../src/academic-years/repositories/academic-period.repository';
import ClassroomSubjectRepository from '../../src/classroom-subjects/classroom-subject.repository';
import GradingScalesService from '../../src/grading-scales/grading-scales.service';
import SubjectPeriodConceptRepository from '../../src/gradebooks/repositories/subject-period-concept.repository';
import {
  CONCEPT_RANGE_DECIMALS_MESSAGE,
  CONCEPT_RANGE_ORDER_MESSAGE,
  CONCEPT_RANGE_OVERLAP_MESSAGE,
  CONCEPT_RANGE_SCALE_MESSAGE,
  GRADEBOOK_PERIOD_CLOSED_MESSAGE,
  GRADEBOOK_YEAR_CLOSED_MESSAGE,
} from '../../src/gradebooks/constants/gradebook-messages.constant';

type Mocked = Record<string, jest.Mock>;

describe('SubjectConceptsService', () => {
  let classroomSubjectRepository: Mocked;
  let periodRepository: Mocked;
  let conceptRepository: Mocked;
  let gradingScalesService: Mocked;
  let service: SubjectConceptsService;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const admin = {
    organizationId: 'org-id',
    userId: 'admin-id',
    roleName: RoleNameEnum.ADMIN,
  };
  const teacher = { ...admin, userId: 'teacher-id', roleName: 'TEACHER' };
  const scale = { minScore: 1, maxScore: 5, passingScore: 3, decimalPlaces: 1 };
  const open = {
    id: 'p1',
    name: 'Periodo 1',
    orderIndex: 1,
    weightPercentage: 50,
    isOpenForGrading: true,
  };
  const closed = { ...open, id: 'p2', orderIndex: 2, isOpenForGrading: false };

  const assignment = (status = AcademicYearStatusEnum.OPEN) => ({
    id: 'cs-id',
    subjectId: 'math',
    teacherId: 'teacher-id',
    classroom: {
      id: 'classroom-id',
      name: '5°A',
      academicYearId: 'y2026',
      homeroomTeacherId: 'homeroom-id',
      academicYear: { id: 'y2026', name: '2026', status },
    },
  });

  const concepts = [
    { minScore: 3, maxScore: 5, conceptText: '  Superó los logros  ' },
    { minScore: 1, maxScore: 2.9, conceptText: 'No alcanzó los logros' },
  ];

  beforeEach(() => {
    classroomSubjectRepository = {
      findOne: jest.fn().mockResolvedValue(assignment()),
      findAll: jest.fn().mockResolvedValue([]),
    };
    periodRepository = { findAll: jest.fn().mockResolvedValue([open, closed]) };
    conceptRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      deleteAllOf: jest.fn().mockResolvedValue(undefined),
      insertMany: jest.fn().mockResolvedValue([]),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    gradingScalesService = { findScale: jest.fn().mockResolvedValue(scale) };

    const gradebooksService = new GradebooksService(
      classroomSubjectRepository as unknown as ClassroomSubjectRepository,
      {} as never,
      periodRepository as unknown as AcademicPeriodRepository,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      conceptRepository as unknown as SubjectPeriodConceptRepository,
      gradingScalesService as unknown as GradingScalesService,
    );
    service = new SubjectConceptsService(
      gradebooksService,
      classroomSubjectRepository as unknown as ClassroomSubjectRepository,
      periodRepository as unknown as AcademicPeriodRepository,
      conceptRepository as unknown as SubjectPeriodConceptRepository,
      gradingScalesService as unknown as GradingScalesService,
    );
  });

  describe('setConcepts', () => {
    it('replaces the ranges of the period', async () => {
      await service.setConcepts(teacher, 'cs-id', 'p1', { concepts });

      expect(conceptRepository.deleteAllOf).toHaveBeenCalledWith(
        'cs-id',
        'p1',
        transaction,
      );
      expect(conceptRepository.insertMany).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            minScore: 3,
            maxScore: 5,
            conceptText: 'Superó los logros',
            organizationId: 'org-id',
            classroomSubjectId: 'cs-id',
            academicPeriodId: 'p1',
            updatedBy: 'teacher-id',
          }),
          expect.objectContaining({ minScore: 1, maxScore: 2.9 }),
        ],
        { transaction },
      );
      expect(conceptRepository.findAll).toHaveBeenCalledWith(
        { classroomSubjectId: 'cs-id', academicPeriodId: 'p1' },
        expect.any(Object),
      );
    });

    it('clears the ranges with an empty list', async () => {
      await service.setConcepts(teacher, 'cs-id', 'p1', { concepts: [] });

      expect(conceptRepository.deleteAllOf).toHaveBeenCalled();
      expect(conceptRepository.insertMany).toHaveBeenCalledWith([], {
        transaction,
      });
    });

    it.each([
      [
        'an inverted range',
        { minScore: 4, maxScore: 3 },
        CONCEPT_RANGE_ORDER_MESSAGE('4.0', '3.0'),
      ],
      [
        'a range outside the scale',
        { minScore: 0, maxScore: 2 },
        CONCEPT_RANGE_SCALE_MESSAGE('1.0', '5.0'),
      ],
      [
        'more decimals than the scale',
        { minScore: 1, maxScore: 2.95 },
        CONCEPT_RANGE_DECIMALS_MESSAGE(1),
      ],
    ])('rejects %s', async (_, range, message) => {
      await expect(
        service.setConcepts(teacher, 'cs-id', 'p1', {
          concepts: [{ ...range, conceptText: 'Texto' }],
        }),
      ).rejects.toThrow(new BadRequestException(message));
      expect(conceptRepository.insertMany).not.toHaveBeenCalled();
    });

    it('rejects overlapping ranges', async () => {
      await expect(
        service.setConcepts(teacher, 'cs-id', 'p1', {
          concepts: [
            { minScore: 1, maxScore: 3, conceptText: 'A' },
            { minScore: 3, maxScore: 5, conceptText: 'B' },
          ],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          CONCEPT_RANGE_OVERLAP_MESSAGE('1.0–3.0', '3.0–5.0'),
        ),
      );
    });

    it('blocks the teacher in a closed period but not the admin', async () => {
      await expect(
        service.setConcepts(teacher, 'cs-id', 'p2', { concepts }),
      ).rejects.toThrow(new ConflictException(GRADEBOOK_PERIOD_CLOSED_MESSAGE));
      await expect(
        service.setConcepts(admin, 'cs-id', 'p2', { concepts }),
      ).resolves.toEqual([]);
    });

    it('blocks everyone in a closed year', async () => {
      classroomSubjectRepository.findOne.mockResolvedValue(
        assignment(AcademicYearStatusEnum.CLOSED),
      );

      await expect(
        service.setConcepts(admin, 'cs-id', 'p1', { concepts }),
      ).rejects.toThrow(new ConflictException(GRADEBOOK_YEAR_CLOSED_MESSAGE));
    });

    it('is read-only for the homeroom teacher', async () => {
      await expect(
        service.setConcepts(
          { ...teacher, userId: 'homeroom-id' },
          'cs-id',
          'p1',
          {
            concepts,
          },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('listSources', () => {
    const classroom = (id: string, name: string, year: string) => ({
      id,
      name,
      gradeLevel: { id: 'g5', name: 'Quinto' },
      academicYear: { id: year, name: year },
    });

    it("lists the teacher's assignments of the subject that have ranges", async () => {
      classroomSubjectRepository.findAll.mockResolvedValue([
        { id: 'other-cs', classroom: classroom('c2', '5°B', '2025') },
        { id: 'cs-id', classroom: classroom('classroom-id', '5°A', '2026') },
        { id: 'empty-cs', classroom: classroom('c3', '5°C', '2026') },
      ]);
      conceptRepository.findAll.mockResolvedValue([
        {
          classroomSubjectId: 'cs-id',
          academicPeriodId: 'p1',
          minScore: 1,
          maxScore: 5,
          conceptText: 'Bien',
        },
        {
          classroomSubjectId: 'other-cs',
          academicPeriodId: 'old-p',
          minScore: 1,
          maxScore: 5,
          conceptText: 'Antes',
        },
      ]);
      periodRepository.findAll
        .mockResolvedValueOnce([open, closed])
        .mockResolvedValueOnce([
          open,
          { id: 'old-p', name: 'Periodo 1', orderIndex: 1 },
        ]);

      const result = await service.listSources(teacher, 'cs-id');

      expect(classroomSubjectRepository.findAll).toHaveBeenCalledWith(
        {
          organizationId: 'org-id',
          subjectId: 'math',
          teacherId: 'teacher-id',
        },
        expect.any(Object),
      );
      expect(
        result.map(({ classroomSubjectId }) => classroomSubjectId),
      ).toEqual(['cs-id', 'other-cs']);
      expect(result[0]).toMatchObject({
        current: true,
        periods: [
          {
            id: 'p1',
            concepts: [{ minScore: 1, maxScore: 5, conceptText: 'Bien' }],
          },
        ],
      });
    });

    it('lets the admin copy from any teacher', async () => {
      await expect(service.listSources(admin, 'cs-id')).resolves.toEqual([]);
      expect(classroomSubjectRepository.findAll).toHaveBeenCalledWith(
        { organizationId: 'org-id', subjectId: 'math' },
        expect.any(Object),
      );
    });

    it('is forbidden for the homeroom teacher', async () => {
      await expect(
        service.listSources({ ...teacher, userId: 'homeroom-id' }, 'cs-id'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
