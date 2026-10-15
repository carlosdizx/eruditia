import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import ClassroomsController from '../../src/classrooms/classrooms.controller';
import ClassroomsService from '../../src/classrooms/classrooms.service';
import CreateClassroomDto from '../../src/classrooms/dto/create-classroom.dto';
import UpdateClassroomDto from '../../src/classrooms/dto/update-classroom.dto';
import ListClassroomsDto from '../../src/classrooms/dto/list-classrooms.dto';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

const handlerMetadata = (handler: string, key: string): unknown =>
  Reflect.getMetadata(
    key,
    Object.getOwnPropertyDescriptor(ClassroomsController.prototype, handler)!
      .value as object,
  );

const errorsOf = async <T extends object>(
  cls: new () => T,
  plain: Record<string, unknown>,
) =>
  (await validate(plainToInstance(cls, plain))).map(({ property }) => property);

const UUID = '0192d6f0-0000-7000-8000-000000000001';

describe('ClassroomsController', () => {
  let service: Record<string, jest.Mock>;
  let controller: ClassroomsController;

  const auth = authContextFixture();

  beforeEach(() => {
    service = Object.fromEntries(
      [
        'listClassrooms',
        'listTeachers',
        'findClassroom',
        'createClassroom',
        'updateClassroom',
        'deleteClassroom',
      ].map((name) => [name, jest.fn().mockResolvedValue({ id: 'c-id' })]),
    );
    controller = new ClassroomsController(
      service as unknown as ClassroomsService,
    );
  });

  describe.each([
    ['listClassrooms', PermissionEnum.CLASSROOM_LIST],
    ['findClassroom', PermissionEnum.CLASSROOM_LIST],
    ['createClassroom', PermissionEnum.CLASSROOM_CREATE],
    ['updateClassroom', PermissionEnum.CLASSROOM_UPDATE],
    ['deleteClassroom', PermissionEnum.CLASSROOM_DELETE],
  ])('%s', (handler, permission) => {
    it(`requires the ADMIN role and the ${permission} permission`, () => {
      expect(handlerMetadata(handler, AUTH_WITH_PERMISSIONS_KEY)).toEqual({
        roles: [RoleNameEnum.ADMIN],
        permissions: [permission],
        mode: 'all',
      });
      expect(handlerMetadata(handler, IS_PUBLIC_KEY)).toBeUndefined();
    });
  });

  it('lists teachers with any permission that assigns them', () => {
    expect(handlerMetadata('listTeachers', AUTH_WITH_PERMISSIONS_KEY)).toEqual({
      roles: [RoleNameEnum.ADMIN],
      permissions: [
        PermissionEnum.CLASSROOM_CREATE,
        PermissionEnum.CLASSROOM_UPDATE,
        PermissionEnum.CLASSROOM_SUBJECT_ASSIGN,
      ],
      mode: 'any',
    });
  });

  it('declares "teachers" before ":classroomId"', () => {
    const handlers = Object.getOwnPropertyNames(ClassroomsController.prototype);
    expect(handlers.indexOf('listTeachers')).toBeLessThan(
      handlers.indexOf('findClassroom'),
    );
  });

  it('delegates with the current organization', async () => {
    const list = { academicYearId: 'year-id' };
    const dto = {
      academicYearId: 'year-id',
      gradeLevelId: 'grade-id',
      name: '1°A',
    };

    await controller.listClassrooms(list, auth);
    await controller.listTeachers(auth);
    await controller.findClassroom('c-id', auth);
    await controller.createClassroom(dto, auth);
    await controller.updateClassroom('c-id', { capacity: 30 }, auth);
    await expect(
      controller.deleteClassroom('c-id', auth),
    ).resolves.toBeUndefined();

    expect(service.listClassrooms).toHaveBeenCalledWith(auth, list);
    expect(service.listTeachers).toHaveBeenCalledWith(auth);
    expect(service.findClassroom).toHaveBeenCalledWith(auth, 'c-id');
    expect(service.createClassroom).toHaveBeenCalledWith(auth, dto);
    expect(service.updateClassroom).toHaveBeenCalledWith(auth, 'c-id', {
      capacity: 30,
    });
    expect(service.deleteClassroom).toHaveBeenCalledWith(auth, 'c-id');
  });
});

describe('classroom DTOs', () => {
  it('requires year, grade and name to create', async () => {
    await expect(errorsOf(CreateClassroomDto, {})).resolves.toEqual([
      'academicYearId',
      'gradeLevelId',
      'name',
    ]);
    await expect(
      errorsOf(CreateClassroomDto, {
        academicYearId: UUID,
        gradeLevelId: UUID,
        name: '1°A',
        capacity: 0,
      }),
    ).resolves.toEqual(['capacity']);
  });

  it('accepts null to clear the teacher and the capacity', async () => {
    await expect(
      errorsOf(UpdateClassroomDto, { homeroomTeacherId: null, capacity: null }),
    ).resolves.toEqual([]);
  });

  it('requires the year to list', async () => {
    await expect(errorsOf(ListClassroomsDto, {})).resolves.toEqual([
      'academicYearId',
    ]);
  });
});
