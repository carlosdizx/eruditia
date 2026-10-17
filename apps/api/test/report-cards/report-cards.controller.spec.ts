import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import ReportCardsController from '../../src/report-cards/report-cards.controller';
import ReportCardsService from '../../src/report-cards/report-cards.service';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

const handlerMetadata = (handler: string, key: string): unknown =>
  Reflect.getMetadata(
    key,
    Object.getOwnPropertyDescriptor(ReportCardsController.prototype, handler)!
      .value as object,
  );

describe('ReportCardsController', () => {
  let service: Record<string, jest.Mock>;
  let controller: ReportCardsController;

  const auth = authContextFixture();

  beforeEach(() => {
    service = Object.fromEntries(
      [
        'getOwnReportCard',
        'getEnrollmentReportCard',
        'getPublicPortal',
        'lookupReportCard',
      ].map((name) => [name, jest.fn().mockResolvedValue({ ok: true })]),
    );
    controller = new ReportCardsController(
      service as unknown as ReportCardsService,
    );
  });

  it('lets only students with the permission see their own report card', () => {
    expect(
      handlerMetadata('getOwnReportCard', AUTH_WITH_PERMISSIONS_KEY),
    ).toEqual({
      roles: [RoleNameEnum.STUDENT],
      permissions: [PermissionEnum.REPORT_CARD_VIEW],
      mode: 'all',
    });
    expect(handlerMetadata('getOwnReportCard', IS_PUBLIC_KEY)).toBeUndefined();
  });

  it('lets admins and teachers preview an enrollment report card', () => {
    expect(
      handlerMetadata('getEnrollmentReportCard', AUTH_WITH_PERMISSIONS_KEY),
    ).toEqual({
      roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
      permissions: [PermissionEnum.REPORT_CARD_VIEW],
      mode: 'all',
    });
  });

  it.each(['getPortal', 'lookupReportCard'])('%s is public', (handler) => {
    expect(handlerMetadata(handler, IS_PUBLIC_KEY)).toBe(true);
  });

  it('delegates', async () => {
    const dto = { documentNumber: '123', accessPin: '123456' };

    await controller.getOwnReportCard({ academicYearId: 'y1' }, auth);
    await controller.getEnrollmentReportCard('e1', auth);
    await controller.getPortal('colegio');
    await controller.lookupReportCard('colegio', dto);

    expect(service.getOwnReportCard).toHaveBeenCalledWith(auth, 'y1');
    expect(service.getEnrollmentReportCard).toHaveBeenCalledWith(auth, 'e1');
    expect(service.getPublicPortal).toHaveBeenCalledWith('colegio');
    expect(service.lookupReportCard).toHaveBeenCalledWith('colegio', dto);
  });
});
