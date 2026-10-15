import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import StudentStatusEnum from '@common/enums/student-status.enum';
import EnrollmentsService from '../../src/enrollments/enrollments.service';
import EnrollmentRepository from '../../src/enrollments/enrollment.repository';
import ClassroomsService from '../../src/classrooms/classrooms.service';
import StudentsService from '../../src/students/students.service';
import {
  ALREADY_ENROLLED_MESSAGE,
  CLASSROOM_FULL_MESSAGE,
  CLOSED_YEAR_ENROLLMENTS_MESSAGE,
  INVALID_STUDENTS_MESSAGE,
  NOT_IN_PROGRESS_MESSAGE,
  OTHER_YEAR_CLASSROOM_MESSAGE,
} from '../../src/enrollments/constants/enrollment-messages.constant';

describe('EnrollmentsService', () => {
  let repository: {
    findOne: jest.Mock;
    findAll: jest.Mock;
    insertMany: jest.Mock;
    updateByPk: jest.Mock;
    deleteByPk: jest.Mock;
    transaction: jest.Mock;
  };
  let classroomsService: { findOne: jest.Mock };
  let studentsService: { findAll: jest.Mock; findByPk: jest.Mock };
  let service: EnrollmentsService;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const actor = { organizationId: 'org-id' };

  const classroom = (
    id = 'classroom-id',
    {
      capacity = null as number | null,
      academicYearId = 'year-id',
      status = AcademicYearStatusEnum.OPEN,
    } = {},
  ) => ({
    id,
    academicYearId,
    capacity,
    academicYear: { id: academicYearId, status },
  });

  const students = [
    { id: 's1', firstName: 'Ana', lastName: 'López' },
    { id: 's2', firstName: 'Luis', lastName: 'Pérez' },
  ];

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      insertMany: jest.fn((rows: object[]) => Promise.resolve(rows)),
      updateByPk: jest.fn().mockResolvedValue({}),
      deleteByPk: jest.fn().mockResolvedValue({}),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    classroomsService = {
      findOne: jest.fn((query: { id: string }) =>
        Promise.resolve(classroom(query.id)),
      ),
    };
    studentsService = {
      findAll: jest.fn().mockResolvedValue(students),
      findByPk: jest.fn().mockResolvedValue(students[0]),
    };
    service = new EnrollmentsService(
      repository as unknown as EnrollmentRepository,
      classroomsService as unknown as ClassroomsService,
      studentsService as unknown as StudentsService,
    );
  });

  describe('listClassroomEnrollments', () => {
    it('lists the class list of a classroom of the organization', async () => {
      classroomsService.findOne.mockResolvedValue(
        classroom('classroom-id', { status: AcademicYearStatusEnum.CLOSED }),
      );

      await service.listClassroomEnrollments(actor, 'classroom-id');

      expect(classroomsService.findOne).toHaveBeenCalledWith(
        { id: 'classroom-id', organizationId: 'org-id' },
        true,
        expect.objectContaining({
          attributes: ['id', 'academicYearId', 'capacity'],
        }),
      );
      expect(repository.findAll).toHaveBeenCalledWith(
        { classroomId: 'classroom-id' },
        expect.any(Object),
      );
    });
  });

  describe('listCandidates', () => {
    it('excludes the students already enrolled in the year', async () => {
      repository.findAll.mockResolvedValue([{ studentId: 's9' }]);

      await service.listCandidates(actor, 'classroom-id');

      expect(repository.findAll).toHaveBeenCalledWith(
        { academicYearId: 'year-id', status: EnrollmentStatusEnum.IN_PROGRESS },
        { attributes: ['studentId'] },
      );
      expect(studentsService.findAll).toHaveBeenCalledWith(
        {
          organizationId: 'org-id',
          status: StudentStatusEnum.ACTIVE,
          id: { [Op.notIn]: ['s9'] },
        },
        expect.any(Object),
      );
    });

    it('lists every active student when nobody is enrolled', async () => {
      await service.listCandidates(actor, 'classroom-id');

      expect(studentsService.findAll).toHaveBeenCalledWith(
        { organizationId: 'org-id', status: StudentStatusEnum.ACTIVE },
        expect.any(Object),
      );
    });
  });

  describe('enrollStudents', () => {
    const dto = { studentIds: ['s1', 's2'], enrollmentDate: '2026-02-01' };

    it('enrolls the students in the classroom and year', async () => {
      await expect(
        service.enrollStudents(actor, 'classroom-id', dto),
      ).resolves.toEqual({ enrolled: 2 });

      expect(studentsService.findAll).toHaveBeenCalledWith(
        {
          id: ['s1', 's2'],
          organizationId: 'org-id',
          status: StudentStatusEnum.ACTIVE,
        },
        expect.any(Object),
      );
      expect(repository.insertMany).toHaveBeenCalledWith(
        ['s1', 's2'].map((studentId) => ({
          organizationId: 'org-id',
          studentId,
          academicYearId: 'year-id',
          classroomId: 'classroom-id',
          enrollmentDate: '2026-02-01',
        })),
        { transaction },
      );
    });

    it('defaults the enrollment date to today', async () => {
      await service.enrollStudents(actor, 'classroom-id', {
        studentIds: ['s1', 's2'],
      });

      const [[rows]] = repository.insertMany.mock.calls as [
        { enrollmentDate: string }[],
      ][];
      expect(rows[0].enrollmentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('rejects inactive or foreign students', async () => {
      studentsService.findAll.mockResolvedValue([students[0]]);

      await expect(
        service.enrollStudents(actor, 'classroom-id', dto),
      ).rejects.toThrow(new BadRequestException(INVALID_STUDENTS_MESSAGE));
      expect(repository.insertMany).not.toHaveBeenCalled();
    });

    it('rejects students already enrolled in the year', async () => {
      repository.findAll.mockResolvedValue([{ studentId: 's2' }]);

      await expect(
        service.enrollStudents(actor, 'classroom-id', dto),
      ).rejects.toThrow(ALREADY_ENROLLED_MESSAGE(['Luis Pérez']));
      expect(repository.findAll).toHaveBeenCalledWith(
        {
          academicYearId: 'year-id',
          status: EnrollmentStatusEnum.IN_PROGRESS,
          studentId: ['s1', 's2'],
        },
        { attributes: ['studentId'] },
      );
    });

    it('respects the classroom capacity', async () => {
      classroomsService.findOne.mockResolvedValue(
        classroom('classroom-id', { capacity: 2 }),
      );
      repository.findAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'e1' }]);

      await expect(
        service.enrollStudents(actor, 'classroom-id', dto),
      ).rejects.toThrow(CLASSROOM_FULL_MESSAGE(2));
    });

    it('does not enroll in a closed year', async () => {
      classroomsService.findOne.mockResolvedValue(
        classroom('classroom-id', { status: AcademicYearStatusEnum.CLOSED }),
      );

      await expect(
        service.enrollStudents(actor, 'classroom-id', dto),
      ).rejects.toThrow(new ConflictException(CLOSED_YEAR_ENROLLMENTS_MESSAGE));
    });
  });

  describe('updateEnrollment', () => {
    const enrollment = (status = EnrollmentStatusEnum.IN_PROGRESS) =>
      repository.findOne.mockResolvedValue({
        id: 'enrollment-id',
        studentId: 's1',
        status,
      });

    it('moves the student to another classroom of the same year', async () => {
      enrollment();

      await service.updateEnrollment(actor, 'classroom-id', 'enrollment-id', {
        classroomId: 'other-id',
      });

      expect(classroomsService.findOne).toHaveBeenCalledWith(
        { id: 'other-id', organizationId: 'org-id' },
        true,
        expect.any(Object),
      );
      expect(repository.updateByPk).toHaveBeenCalledWith(
        'enrollment-id',
        { classroomId: 'other-id' },
        undefined,
      );
      expect(repository.findOne).toHaveBeenLastCalledWith(
        { id: 'enrollment-id', classroomId: 'other-id' },
        true,
        expect.any(Object),
      );
    });

    it('does not move to a classroom of another year', async () => {
      enrollment();
      classroomsService.findOne
        .mockResolvedValueOnce(classroom())
        .mockResolvedValueOnce(
          classroom('other-id', { academicYearId: 'other-year' }),
        );

      await expect(
        service.updateEnrollment(actor, 'classroom-id', 'enrollment-id', {
          classroomId: 'other-id',
        }),
      ).rejects.toThrow(OTHER_YEAR_CLASSROOM_MESSAGE);
    });

    it('does not move a closed enrollment', async () => {
      enrollment(EnrollmentStatusEnum.WITHDRAWN);

      await expect(
        service.updateEnrollment(actor, 'classroom-id', 'enrollment-id', {
          classroomId: 'other-id',
        }),
      ).rejects.toThrow(NOT_IN_PROGRESS_MESSAGE);
    });

    it('withdraws a student keeping the enrollment', async () => {
      enrollment();

      await service.updateEnrollment(actor, 'classroom-id', 'enrollment-id', {
        status: EnrollmentStatusEnum.WITHDRAWN,
        promotionNotes: 'Cambio de ciudad',
      });

      expect(repository.updateByPk).toHaveBeenCalledWith(
        'enrollment-id',
        {
          status: EnrollmentStatusEnum.WITHDRAWN,
          promotionNotes: 'Cambio de ciudad',
        },
        undefined,
      );
    });

    it('does not reactivate a student enrolled elsewhere in the year', async () => {
      enrollment(EnrollmentStatusEnum.WITHDRAWN);
      repository.findAll.mockResolvedValue([{ studentId: 's1' }]);

      await expect(
        service.updateEnrollment(actor, 'classroom-id', 'enrollment-id', {
          status: EnrollmentStatusEnum.IN_PROGRESS,
        }),
      ).rejects.toThrow(ALREADY_ENROLLED_MESSAGE(['Ana López']));
      expect(repository.updateByPk).not.toHaveBeenCalled();
    });
  });

  describe('removeEnrollment', () => {
    it('deletes an enrollment of the classroom', async () => {
      repository.findOne.mockResolvedValue({ id: 'enrollment-id' });

      await service.removeEnrollment(actor, 'classroom-id', 'enrollment-id');

      expect(repository.findOne).toHaveBeenCalledWith(
        { id: 'enrollment-id', classroomId: 'classroom-id' },
        true,
        { attributes: ['id'] },
      );
      expect(repository.deleteByPk).toHaveBeenCalledWith(
        'enrollment-id',
        undefined,
      );
    });
  });
});
