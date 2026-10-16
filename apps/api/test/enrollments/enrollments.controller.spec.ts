import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import EnrollmentsController from '../../src/enrollments/enrollments.controller';
import EnrollmentsService from '../../src/enrollments/enrollments.service';
import StudentEnrollmentsController from '../../src/enrollments/student-enrollments.controller';
import PromotionsController from '../../src/enrollments/promotions.controller';
import PromotionsService from '../../src/enrollments/promotions.service';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

const metadataOf = (
  handler: string,
  key: string,
  target: object = EnrollmentsController.prototype,
): unknown =>
  Reflect.getMetadata(
    key,
    Object.getOwnPropertyDescriptor(target, handler)!.value as object,
  );

describe('EnrollmentsController', () => {
  const auth = authContextFixture();

  it('lets admins and teachers see the class list', () => {
    expect(
      metadataOf('listClassroomEnrollments', AUTH_WITH_PERMISSIONS_KEY),
    ).toEqual({
      roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
      permissions: [PermissionEnum.ENROLLMENT_LIST],
      mode: 'all',
    });
  });

  describe.each([
    ['listCandidates', PermissionEnum.ENROLLMENT_CREATE],
    ['enrollStudents', PermissionEnum.ENROLLMENT_CREATE],
    ['updateEnrollment', PermissionEnum.ENROLLMENT_UPDATE],
    ['removeEnrollment', PermissionEnum.ENROLLMENT_DELETE],
  ])('%s', (handler, permission) => {
    it(`requires the ADMIN role and the ${permission} permission`, () => {
      expect(metadataOf(handler, AUTH_WITH_PERMISSIONS_KEY)).toEqual({
        roles: [RoleNameEnum.ADMIN],
        permissions: [permission],
        mode: 'all',
      });
      expect(metadataOf(handler, IS_PUBLIC_KEY)).toBeUndefined();
    });
  });

  it('delegates with the current organization', async () => {
    const service = Object.fromEntries(
      [
        'listClassroomEnrollments',
        'listCandidates',
        'enrollStudents',
        'updateEnrollment',
        'removeEnrollment',
      ].map((name) => [name, jest.fn().mockResolvedValue({ id: 'x' })]),
    );
    const controller = new EnrollmentsController(
      service as unknown as EnrollmentsService,
    );
    const enroll = { studentIds: ['s1'] };
    const update = { status: EnrollmentStatusEnum.WITHDRAWN } as const;

    await controller.listClassroomEnrollments('c-id', auth);
    await controller.listCandidates('c-id', auth);
    await controller.enrollStudents('c-id', enroll, auth);
    await controller.updateEnrollment('c-id', 'e-id', update, auth);
    await expect(
      controller.removeEnrollment('c-id', 'e-id', auth),
    ).resolves.toBeUndefined();

    expect(service.listClassroomEnrollments).toHaveBeenCalledWith(auth, 'c-id');
    expect(service.listCandidates).toHaveBeenCalledWith(auth, 'c-id');
    expect(service.enrollStudents).toHaveBeenCalledWith(auth, 'c-id', enroll);
    expect(service.updateEnrollment).toHaveBeenCalledWith(
      auth,
      'c-id',
      'e-id',
      update,
    );
    expect(service.removeEnrollment).toHaveBeenCalledWith(auth, 'c-id', 'e-id');
  });
});

describe('StudentEnrollmentsController', () => {
  it('lets admins and teachers see the history', () => {
    expect(
      metadataOf(
        'listStudentHistory',
        AUTH_WITH_PERMISSIONS_KEY,
        StudentEnrollmentsController.prototype,
      ),
    ).toEqual({
      roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
      permissions: [PermissionEnum.ENROLLMENT_LIST],
      mode: 'all',
    });
  });

  it('delegates with the current session', async () => {
    const auth = authContextFixture({ roleName: RoleNameEnum.TEACHER });
    const service = { listStudentHistory: jest.fn().mockResolvedValue({}) };
    const controller = new StudentEnrollmentsController(
      service as unknown as EnrollmentsService,
    );

    await controller.listStudentHistory('s-id', auth);

    expect(service.listStudentHistory).toHaveBeenCalledWith(auth, 's-id');
  });
});

describe('PromotionsController', () => {
  it.each(['preview', 'promote'])(
    '%s requires the ADMIN role and the promote permission',
    (handler) => {
      expect(
        metadataOf(
          handler,
          AUTH_WITH_PERMISSIONS_KEY,
          PromotionsController.prototype,
        ),
      ).toEqual({
        roles: [RoleNameEnum.ADMIN],
        permissions: [PermissionEnum.ENROLLMENT_PROMOTE],
        mode: 'all',
      });
    },
  );

  it('delegates with the current organization', async () => {
    const auth = authContextFixture();
    const service = {
      preview: jest.fn().mockResolvedValue({}),
      promote: jest.fn().mockResolvedValue({}),
    };
    const controller = new PromotionsController(
      service as unknown as PromotionsService,
    );
    const query = { sourceClassroomId: 'c', targetAcademicYearId: 'y' };
    const body = { ...query, decisions: [] };

    await controller.preview(query, auth);
    await controller.promote(body, auth);

    expect(service.preview).toHaveBeenCalledWith(auth, query);
    expect(service.promote).toHaveBeenCalledWith(auth, body);
  });
});
