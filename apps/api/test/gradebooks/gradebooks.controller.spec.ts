import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import GradebooksController from '../../src/gradebooks/gradebooks.controller';
import GradebooksService from '../../src/gradebooks/gradebooks.service';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

const handlerMetadata = (handler: string): unknown =>
  Reflect.getMetadata(
    AUTH_WITH_PERMISSIONS_KEY,
    Object.getOwnPropertyDescriptor(GradebooksController.prototype, handler)!
      .value as object,
  );

describe('GradebooksController', () => {
  let service: Record<string, jest.Mock>;
  let controller: GradebooksController;

  const auth = authContextFixture();

  beforeEach(() => {
    service = Object.fromEntries(
      [
        'listClassroomGradebooks',
        'getGradebook',
        'getAnnualSummary',
        'setEvaluationItems',
        'saveGrades',
      ].map((name) => [name, jest.fn().mockResolvedValue({ ok: true })]),
    );
    controller = new GradebooksController(
      service as unknown as GradebooksService,
    );
  });

  it('is restricted to admins and teachers', () => {
    expect(
      Reflect.getMetadata(AUTH_WITH_PERMISSIONS_KEY, GradebooksController),
    ).toEqual({
      roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
      permissions: [],
      mode: 'all',
    });
  });

  it.each([
    ['listClassroomGradebooks', PermissionEnum.GRADE_LIST],
    ['getGradebook', PermissionEnum.GRADE_LIST],
    ['getAnnualSummary', PermissionEnum.GRADE_LIST],
    ['setEvaluationItems', PermissionEnum.GRADE_RECORD],
    ['saveGrades', PermissionEnum.GRADE_RECORD],
  ])('%s requires %s', (handler, permission) => {
    expect(handlerMetadata(handler)).toEqual({
      roles: [],
      permissions: [permission],
      mode: 'all',
    });
  });

  it('delegates with the session', async () => {
    const items = { items: [{ title: 'Examen', weightPercentage: 100 }] };
    const grades = { students: [{ enrollmentId: 'e1' }] };

    await controller.listClassroomGradebooks('classroom-id', auth);
    await controller.getGradebook('cs-id', { periodId: 'p1' }, auth);
    await controller.getAnnualSummary('cs-id', auth);
    await controller.setEvaluationItems('cs-id', 'p1', items, auth);
    await controller.saveGrades('cs-id', 'p1', grades, auth);

    expect(service.listClassroomGradebooks).toHaveBeenCalledWith(
      auth,
      'classroom-id',
    );
    expect(service.getGradebook).toHaveBeenCalledWith(auth, 'cs-id', 'p1');
    expect(service.getAnnualSummary).toHaveBeenCalledWith(auth, 'cs-id');
    expect(service.setEvaluationItems).toHaveBeenCalledWith(
      auth,
      'cs-id',
      'p1',
      items,
    );
    expect(service.saveGrades).toHaveBeenCalledWith(
      auth,
      'cs-id',
      'p1',
      grades,
    );
  });
});
