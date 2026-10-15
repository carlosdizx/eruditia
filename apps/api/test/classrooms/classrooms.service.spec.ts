import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import ClassroomsService, {
  CLASSROOM_INCLUDE,
} from '../../src/classrooms/classrooms.service';
import ClassroomRepository from '../../src/classrooms/classroom.repository';
import AcademicYearsService from '../../src/academic-years/academic-years.service';
import GradeLevelsService from '../../src/grade-levels/grade-levels.service';
import UsersService from '../../src/users/users.service';
import GradeLevelModel from '@database/models/grade-level.model';
import {
  CLASSROOM_NAME_IN_USE_MESSAGE,
  CLOSED_YEAR_CLASSROOMS_MESSAGE,
  INVALID_TEACHER_MESSAGE,
} from '../../src/classrooms/constants/classroom-messages.constant';

describe('ClassroomsService', () => {
  let repository: {
    findOne: jest.Mock;
    findAll: jest.Mock;
    create: jest.Mock;
    updateByPk: jest.Mock;
    deleteByPk: jest.Mock;
  };
  let academicYearsService: { findOne: jest.Mock };
  let gradeLevelsService: { findOne: jest.Mock };
  let usersService: { findOrganizationTeachers: jest.Mock };
  let service: ClassroomsService;

  const actor = { organizationId: 'org-id' };

  const dto = {
    academicYearId: 'year-id',
    gradeLevelId: 'grade-id',
    name: '1°A',
    homeroomTeacherId: 'teacher-id',
    capacity: 30,
  };

  // findOne por id responde el salón; el resto (nombre repetido) no encuentra.
  const mockClassroom = () =>
    repository.findOne.mockImplementation((query: { id?: unknown }) =>
      Promise.resolve(
        typeof query.id === 'string'
          ? {
              id: query.id,
              academicYearId: 'year-id',
              homeroomTeacherId: 'current-teacher-id',
            }
          : null,
      ),
    );

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn((data: object) =>
        Promise.resolve({ id: 'classroom-id', ...data }),
      ),
      updateByPk: jest.fn().mockResolvedValue({}),
      deleteByPk: jest.fn().mockResolvedValue({}),
    };
    academicYearsService = {
      findOne: jest.fn().mockResolvedValue({
        id: 'year-id',
        status: AcademicYearStatusEnum.OPEN,
      }),
    };
    gradeLevelsService = {
      findOne: jest.fn().mockResolvedValue({ id: 'grade-id' }),
    };
    usersService = {
      findOrganizationTeachers: jest
        .fn()
        .mockResolvedValue([{ id: 'teacher-id' }]),
    };
    service = new ClassroomsService(
      repository as unknown as ClassroomRepository,
      academicYearsService as unknown as AcademicYearsService,
      gradeLevelsService as unknown as GradeLevelsService,
      usersService as unknown as UsersService,
    );
  });

  describe('listClassrooms', () => {
    it('lists the classrooms of a year by grade order and name', async () => {
      await service.listClassrooms(actor, { academicYearId: 'year-id' });

      expect(repository.findAll).toHaveBeenCalledWith(
        { organizationId: 'org-id', academicYearId: 'year-id' },
        {
          include: CLASSROOM_INCLUDE,
          order: [
            [
              { model: GradeLevelModel, as: 'gradeLevel' },
              'sequenceOrder',
              'ASC',
            ],
            ['name', 'ASC'],
          ],
        },
      );
    });

    it('filters by grade', async () => {
      await service.listClassrooms(actor, {
        academicYearId: 'year-id',
        gradeLevelId: 'grade-id',
      });

      expect(repository.findAll.mock.calls[0][0]).toEqual({
        organizationId: 'org-id',
        academicYearId: 'year-id',
        gradeLevelId: 'grade-id',
      });
    });

    it('rejects an actor without organization', async () => {
      await expect(
        service.listClassrooms(
          { organizationId: null },
          { academicYearId: 'year-id' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it('lists the active teachers of the organization', async () => {
    await service.listTeachers(actor);

    expect(usersService.findOrganizationTeachers).toHaveBeenCalledWith(
      'org-id',
    );
  });

  describe('createClassroom', () => {
    it('validates year, grade, teacher and name inside the organization', async () => {
      mockClassroom();

      await service.createClassroom(actor, dto);

      expect(academicYearsService.findOne).toHaveBeenCalledWith(
        { id: 'year-id', organizationId: 'org-id' },
        true,
        { attributes: ['id', 'status'] },
      );
      expect(gradeLevelsService.findOne).toHaveBeenCalledWith(
        { id: 'grade-id', organizationId: 'org-id' },
        true,
        { attributes: ['id'] },
      );
      expect(usersService.findOrganizationTeachers).toHaveBeenCalledWith(
        'org-id',
        ['teacher-id'],
      );
      expect(repository.findOne).toHaveBeenCalledWith(
        { academicYearId: 'year-id', name: '1°A' },
        false,
        { attributes: ['id'] },
      );
      expect(repository.create).toHaveBeenCalledWith(
        { ...dto, organizationId: 'org-id' },
        undefined,
      );
      expect(repository.findOne).toHaveBeenLastCalledWith(
        { id: 'classroom-id', organizationId: 'org-id' },
        true,
        { include: CLASSROOM_INCLUDE },
      );
    });

    it('does not need a homeroom teacher', async () => {
      mockClassroom();
      const { homeroomTeacherId: _teacher, ...withoutTeacher } = dto;

      await service.createClassroom(actor, withoutTeacher);

      expect(usersService.findOrganizationTeachers).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalled();
    });

    it('rejects a homeroom teacher that is not an active teacher of the organization', async () => {
      usersService.findOrganizationTeachers.mockResolvedValue([]);

      await expect(service.createClassroom(actor, dto)).rejects.toThrow(
        INVALID_TEACHER_MESSAGE,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a closed year', async () => {
      academicYearsService.findOne.mockResolvedValue({
        id: 'year-id',
        status: AcademicYearStatusEnum.CLOSED,
      });

      await expect(service.createClassroom(actor, dto)).rejects.toThrow(
        CLOSED_YEAR_CLASSROOMS_MESSAGE,
      );
    });

    it('rejects a year or grade of another organization', async () => {
      gradeLevelsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.createClassroom(actor, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects a name already used in the year', async () => {
      repository.findOne.mockResolvedValue({ id: 'other-id' });

      await expect(service.createClassroom(actor, dto)).rejects.toThrow(
        CLASSROOM_NAME_IN_USE_MESSAGE,
      );
    });
  });

  describe('updateClassroom', () => {
    it('checks the new name against the other classrooms of its year', async () => {
      mockClassroom();

      await service.updateClassroom(actor, 'classroom-id', {
        name: '1°B',
        homeroomTeacherId: null,
        capacity: null,
      });

      expect(repository.findOne).toHaveBeenCalledWith(
        {
          academicYearId: 'year-id',
          name: '1°B',
          id: { [Op.ne]: 'classroom-id' },
        },
        false,
        { attributes: ['id'] },
      );
      expect(usersService.findOrganizationTeachers).not.toHaveBeenCalled();
      expect(repository.updateByPk).toHaveBeenCalledWith(
        'classroom-id',
        { name: '1°B', homeroomTeacherId: null, capacity: null },
        undefined,
      );
    });

    it('validates a new homeroom teacher', async () => {
      mockClassroom();
      usersService.findOrganizationTeachers.mockResolvedValue([]);

      await expect(
        service.updateClassroom(actor, 'classroom-id', {
          homeroomTeacherId: 'student-id',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateByPk).not.toHaveBeenCalled();
    });

    it('keeps the current homeroom teacher without revalidating it', async () => {
      mockClassroom();
      usersService.findOrganizationTeachers.mockResolvedValue([]);

      await service.updateClassroom(actor, 'classroom-id', {
        homeroomTeacherId: 'current-teacher-id',
      });

      expect(usersService.findOrganizationTeachers).not.toHaveBeenCalled();
      expect(repository.updateByPk).toHaveBeenCalled();
    });

    it('does not modify classrooms of a closed year', async () => {
      mockClassroom();
      academicYearsService.findOne.mockResolvedValue({
        id: 'year-id',
        status: AcademicYearStatusEnum.CLOSED,
      });

      await expect(
        service.updateClassroom(actor, 'classroom-id', { capacity: 20 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns 404 for a classroom of another organization', async () => {
      repository.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.updateClassroom(actor, 'classroom-id', { capacity: 20 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteClassroom', () => {
    it('deletes a classroom of an open year', async () => {
      mockClassroom();

      await service.deleteClassroom(actor, 'classroom-id');

      expect(repository.findOne).toHaveBeenCalledWith(
        { id: 'classroom-id', organizationId: 'org-id' },
        true,
        { attributes: ['id', 'academicYearId', 'homeroomTeacherId'] },
      );
      expect(repository.deleteByPk).toHaveBeenCalledWith(
        'classroom-id',
        undefined,
      );
    });

    it('does not delete classrooms of a closed year', async () => {
      mockClassroom();
      academicYearsService.findOne.mockResolvedValue({
        id: 'year-id',
        status: AcademicYearStatusEnum.CLOSED,
      });

      await expect(
        service.deleteClassroom(actor, 'classroom-id'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.deleteByPk).not.toHaveBeenCalled();
    });
  });
});
