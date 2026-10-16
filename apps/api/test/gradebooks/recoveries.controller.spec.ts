import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import RecoveriesController from '../../src/gradebooks/recoveries.controller';
import RecoveriesService from '../../src/gradebooks/recoveries.service';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

describe('RecoveriesController', () => {
  let service: Record<string, jest.Mock>;
  let controller: RecoveriesController;

  const auth = authContextFixture();

  beforeEach(() => {
    service = Object.fromEntries(
      ['listRecoveries', 'saveRecovery', 'deleteRecovery'].map((name) => [
        name,
        jest.fn().mockResolvedValue({ ok: true }),
      ]),
    );
    controller = new RecoveriesController(
      service as unknown as RecoveriesService,
    );
  });

  it('requires grade:recover for admins and teachers', () => {
    expect(
      Reflect.getMetadata(AUTH_WITH_PERMISSIONS_KEY, RecoveriesController),
    ).toEqual({
      roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
      permissions: [PermissionEnum.GRADE_RECOVER],
      mode: 'all',
    });
  });

  it('delegates with the session', async () => {
    await controller.listRecoveries({ academicYearId: 'y1' }, auth);
    await controller.saveRecovery('cs-id', 'e1', { score: 3.5 }, auth);
    await controller.deleteRecovery('cs-id', 'e1', auth);

    expect(service.listRecoveries).toHaveBeenCalledWith(auth, 'y1');
    expect(service.saveRecovery).toHaveBeenCalledWith(auth, 'cs-id', 'e1', {
      score: 3.5,
    });
    expect(service.deleteRecovery).toHaveBeenCalledWith(auth, 'cs-id', 'e1');
  });
});
