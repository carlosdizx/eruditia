import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import RankingsController from '../../src/rankings/rankings.controller';
import RankingsService from '../../src/rankings/rankings.service';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

describe('RankingsController', () => {
  const service = {
    getOptions: jest.fn().mockResolvedValue({}),
    getRanking: jest.fn().mockResolvedValue({}),
    getSubjectLeaders: jest.fn().mockResolvedValue({}),
  };
  const controller = new RankingsController(
    service as unknown as RankingsService,
  );
  const auth = authContextFixture();

  it('requires ranking:view for admins and teachers', () => {
    expect(
      Reflect.getMetadata(AUTH_WITH_PERMISSIONS_KEY, RankingsController),
    ).toEqual({
      roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
      permissions: [PermissionEnum.RANKING_VIEW],
      mode: 'all',
    });
  });

  it('delegates with the session', async () => {
    const dto = { classroomId: 'c1', limit: 3 };

    await controller.getOptions({ academicYearId: 'y1' }, auth);
    await controller.getRanking(dto, auth);
    await controller.getSubjectLeaders({ classroomId: 'c1' }, auth);

    expect(service.getOptions).toHaveBeenCalledWith(auth, 'y1');
    expect(service.getRanking).toHaveBeenCalledWith(auth, dto);
    expect(service.getSubjectLeaders).toHaveBeenCalledWith(auth, {
      classroomId: 'c1',
    });
  });
});
