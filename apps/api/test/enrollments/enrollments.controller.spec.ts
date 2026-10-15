import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import EnrollmentsController from '../../src/enrollments/enrollments.controller';
import EnrollmentsService from '../../src/enrollments/enrollments.service';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

const metadataOf = (handler: string, key: string): unknown =>
  Reflect.getMetadata(
    key,
    Object.getOwnPropertyDescriptor(EnrollmentsController.prototype, handler)!
      .value as object,
  );

describe('EnrollmentsController', () => {
  const auth = authContextFixture();

  describe.each([
    ['listClassroomEnrollments', PermissionEnum.ENROLLMENT_LIST],
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
