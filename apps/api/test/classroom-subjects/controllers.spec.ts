import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import ClassroomSubjectsController from '../../src/classroom-subjects/classroom-subjects.controller';
import ClassroomSubjectsService from '../../src/classroom-subjects/classroom-subjects.service';
import SubjectsController from '../../src/subjects/subjects.controller';
import SubjectsService from '../../src/subjects/subjects.service';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

const metadataOf = (target: object, handler: string, key: string): unknown =>
  Reflect.getMetadata(
    key,
    Object.getOwnPropertyDescriptor(target, handler)!.value as object,
  );

const mockService = (names: string[]) =>
  Object.fromEntries(
    names.map((name) => [name, jest.fn().mockResolvedValue({ id: 'x' })]),
  );

describe('SubjectsController', () => {
  const auth = authContextFixture();

  describe.each([
    ['listSubjects', PermissionEnum.SUBJECT_LIST],
    ['createSubject', PermissionEnum.SUBJECT_CREATE],
    ['loadStandardSubjects', PermissionEnum.SUBJECT_CREATE],
    ['updateSubject', PermissionEnum.SUBJECT_UPDATE],
    ['deleteSubject', PermissionEnum.SUBJECT_DELETE],
  ])('%s', (handler, permission) => {
    it(`requires the ADMIN role and the ${permission} permission`, () => {
      expect(
        metadataOf(
          SubjectsController.prototype,
          handler,
          AUTH_WITH_PERMISSIONS_KEY,
        ),
      ).toEqual({
        roles: [RoleNameEnum.ADMIN],
        permissions: [permission],
        mode: 'all',
      });
      expect(
        metadataOf(SubjectsController.prototype, handler, IS_PUBLIC_KEY),
      ).toBeUndefined();
    });
  });

  it('delegates with the current organization', async () => {
    const service = mockService([
      'listSubjects',
      'createSubject',
      'loadStandardSubjects',
      'updateSubject',
      'deleteSubject',
    ]);
    const controller = new SubjectsController(
      service as unknown as SubjectsService,
    );
    const dto = { name: 'Matemáticas', code: 'MAT' };

    await controller.listSubjects(auth);
    await controller.createSubject(dto, auth);
    await controller.loadStandardSubjects(auth);
    await controller.updateSubject('s-id', { code: 'M' }, auth);
    await expect(
      controller.deleteSubject('s-id', auth),
    ).resolves.toBeUndefined();

    expect(service.listSubjects).toHaveBeenCalledWith(auth);
    expect(service.createSubject).toHaveBeenCalledWith(auth, dto);
    expect(service.loadStandardSubjects).toHaveBeenCalledWith(auth);
    expect(service.updateSubject).toHaveBeenCalledWith(auth, 's-id', {
      code: 'M',
    });
    expect(service.deleteSubject).toHaveBeenCalledWith(auth, 's-id');
  });
});

describe('ClassroomSubjectsController', () => {
  const auth = authContextFixture();
  const prototype = ClassroomSubjectsController.prototype;

  describe.each([
    ['listClassroomSubjects', [PermissionEnum.CLASSROOM_SUBJECT_LIST]],
    ['assignSubject', [PermissionEnum.CLASSROOM_SUBJECT_ASSIGN]],
    ['updateClassroomSubject', [PermissionEnum.CLASSROOM_SUBJECT_ASSIGN]],
    ['removeClassroomSubject', [PermissionEnum.CLASSROOM_SUBJECT_ASSIGN]],
    [
      'copyStructure',
      [
        PermissionEnum.CLASSROOM_CREATE,
        PermissionEnum.CLASSROOM_SUBJECT_ASSIGN,
      ],
    ],
  ])('%s', (handler, permissions) => {
    it(`requires the ADMIN role and ${permissions.join(' + ')}`, () => {
      expect(metadataOf(prototype, handler, AUTH_WITH_PERMISSIONS_KEY)).toEqual(
        { roles: [RoleNameEnum.ADMIN], permissions, mode: 'all' },
      );
    });
  });

  it('lets only teachers list their own assignments', () => {
    expect(
      metadataOf(prototype, 'listMyAssignments', AUTH_WITH_PERMISSIONS_KEY),
    ).toEqual({
      roles: [RoleNameEnum.TEACHER],
      permissions: [PermissionEnum.CLASSROOM_SUBJECT_LIST],
      mode: 'all',
    });
  });

  it('delegates with the current session', async () => {
    const service = mockService([
      'listMyAssignments',
      'copyStructure',
      'listClassroomSubjects',
      'assignSubject',
      'updateClassroomSubject',
      'removeClassroomSubject',
    ]);
    const controller = new ClassroomSubjectsController(
      service as unknown as ClassroomSubjectsService,
    );
    const copy = { sourceAcademicYearId: 'a', targetAcademicYearId: 'b' };

    await controller.listMyAssignments({ academicYearId: 'y' }, auth);
    await controller.copyStructure(copy, auth);
    await controller.listClassroomSubjects('c', auth);
    await controller.assignSubject('c', { subjectId: 's' }, auth);
    await controller.updateClassroomSubject('c', 'a', { weeklyHours: 2 }, auth);
    await expect(
      controller.removeClassroomSubject('c', 'a', auth),
    ).resolves.toBeUndefined();

    expect(service.listMyAssignments).toHaveBeenCalledWith(auth, 'y');
    expect(service.copyStructure).toHaveBeenCalledWith(auth, copy);
    expect(service.listClassroomSubjects).toHaveBeenCalledWith(auth, 'c');
    expect(service.assignSubject).toHaveBeenCalledWith(auth, 'c', {
      subjectId: 's',
    });
    expect(service.updateClassroomSubject).toHaveBeenCalledWith(
      auth,
      'c',
      'a',
      { weeklyHours: 2 },
    );
    expect(service.removeClassroomSubject).toHaveBeenCalledWith(auth, 'c', 'a');
  });
});
