import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import StudentDocumentTypeEnum from '@common/enums/student-document-type.enum';
import StudentStatusEnum from '@common/enums/student-status.enum';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import StudentsController from '../../src/students/students.controller';
import StudentsService from '../../src/students/students.service';
import StudentAccessService from '../../src/students/student-access.service';
import ListStudentsDto from '../../src/students/dto/list-students.dto';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

const handlerMetadata = (handler: string, key: string): unknown =>
  Reflect.getMetadata(
    key,
    Object.getOwnPropertyDescriptor(StudentsController.prototype, handler)!
      .value as object,
  );

describe('StudentsController', () => {
  let studentsService: {
    listStudents: jest.Mock;
    findStudent: jest.Mock;
    createStudent: jest.Mock;
    updateStudent: jest.Mock;
    importStudents: jest.Mock;
  };
  let studentAccessService: {
    regenerateAccessPin: jest.Mock;
    linkAccount: jest.Mock;
    unlinkAccount: jest.Mock;
  };
  let controller: StudentsController;

  const auth = authContextFixture();

  beforeEach(() => {
    studentsService = {
      listStudents: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findStudent: jest.fn().mockResolvedValue({ id: 'student-id' }),
      createStudent: jest.fn().mockResolvedValue({ id: 'new-id' }),
      updateStudent: jest.fn().mockResolvedValue({ id: 'student-id' }),
      importStudents: jest.fn().mockResolvedValue({ created: 1 }),
    };
    studentAccessService = {
      regenerateAccessPin: jest.fn().mockResolvedValue({ accessPin: '012345' }),
      linkAccount: jest.fn().mockResolvedValue({ id: 'student-id' }),
      unlinkAccount: jest.fn().mockResolvedValue({ accessPin: '012345' }),
    };
    controller = new StudentsController(
      studentsService as unknown as StudentsService,
      studentAccessService as unknown as StudentAccessService,
    );
  });

  describe.each([
    ['listStudents', PermissionEnum.STUDENT_LIST],
    ['findStudent', PermissionEnum.STUDENT_LIST],
    ['createStudent', PermissionEnum.STUDENT_CREATE],
    ['updateStudent', PermissionEnum.STUDENT_UPDATE],
    ['importStudents', PermissionEnum.STUDENT_IMPORT],
    ['regenerateAccessPin', PermissionEnum.STUDENT_UPDATE],
    ['linkAccount', PermissionEnum.STUDENT_UPDATE],
    ['unlinkAccount', PermissionEnum.STUDENT_UPDATE],
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

  it('lists the students of the current organization', async () => {
    const dto = new ListStudentsDto();

    await controller.listStudents(dto, auth);

    expect(studentsService.listStudents).toHaveBeenCalledWith(auth, dto);
  });

  it('finds a student of the current organization', async () => {
    await expect(controller.findStudent('student-id', auth)).resolves.toEqual({
      id: 'student-id',
    });
    expect(studentsService.findStudent).toHaveBeenCalledWith(
      auth,
      'student-id',
    );
  });

  it('creates a student in the current organization', async () => {
    const dto = {
      firstName: 'Sofía',
      lastName: 'Pérez',
      documentType: StudentDocumentTypeEnum.RC,
      documentNumber: '1020',
    };

    await expect(controller.createStudent(dto, auth)).resolves.toEqual({
      id: 'new-id',
    });
    expect(studentsService.createStudent).toHaveBeenCalledWith(auth, dto);
  });

  it('updates a student of the current organization', async () => {
    const dto = { status: StudentStatusEnum.SUSPENDED };

    await controller.updateStudent('student-id', dto, auth);

    expect(studentsService.updateStudent).toHaveBeenCalledWith(
      auth,
      'student-id',
      dto,
    );
  });

  it('imports the uploaded file into the current organization', async () => {
    const buffer = Buffer.from('csv');

    await expect(controller.importStudents({ buffer }, auth)).resolves.toEqual({
      created: 1,
    });
    expect(studentsService.importStudents).toHaveBeenCalledWith(auth, buffer);
  });

  it('regenerates the PIN of a student of the current organization', async () => {
    await expect(
      controller.regenerateAccessPin('student-id', auth),
    ).resolves.toEqual({ accessPin: '012345' });
    expect(studentAccessService.regenerateAccessPin).toHaveBeenCalledWith(
      auth,
      'student-id',
    );
  });

  it('links an account by email', async () => {
    await controller.linkAccount(
      'student-id',
      { email: 'sofia@example.com' },
      auth,
    );

    expect(studentAccessService.linkAccount).toHaveBeenCalledWith(
      auth,
      'student-id',
      'sofia@example.com',
    );
  });

  it('unlinks the account and returns the new PIN', async () => {
    await expect(controller.unlinkAccount('student-id', auth)).resolves.toEqual(
      { accessPin: '012345' },
    );
    expect(studentAccessService.unlinkAccount).toHaveBeenCalledWith(
      auth,
      'student-id',
    );
  });
});
