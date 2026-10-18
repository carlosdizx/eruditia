import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import ReportCardsController from '../../src/report-cards/report-cards.controller';
import ReportCardsService from '../../src/report-cards/report-cards.service';
import PortalRateLimitGuard from '../../src/report-cards/guards/portal-rate-limit.guard';
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
        'getEnrollmentReportCard',
        'getEnrollmentReportCardPdf',
        'getClassroomReportCardsPdf',
        'listClassroomPeriods',
        'lookupReportCardPdf',
        'getPublicPortal',
        'lookupReportCard',
      ].map((name) => [
        name,
        jest
          .fn()
          .mockResolvedValue(
            name.endsWith('Pdf')
              ? { filename: 'boletin.pdf', content: Buffer.from('%PDF-') }
              : { ok: true },
          ),
      ]),
    );
    controller = new ReportCardsController(
      service as unknown as ReportCardsService,
    );
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

  it.each([
    'getEnrollmentReportCardPdf',
    'getClassroomReportCardsPdf',
    'listClassroomPeriods',
  ])('%s requires report-card:export for admins and teachers', (handler) => {
    expect(handlerMetadata(handler, AUTH_WITH_PERMISSIONS_KEY)).toEqual({
      roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
      permissions: [PermissionEnum.REPORT_CARD_EXPORT],
      mode: 'all',
    });
  });

  it('streams the PDF as a download', async () => {
    const file = await controller.getClassroomReportCardsPdf(
      'c1',
      { periodId: 'p1' },
      auth,
    );

    expect(service.getClassroomReportCardsPdf).toHaveBeenCalledWith(
      auth,
      'c1',
      'p1',
    );
    expect(file.getHeaders()).toMatchObject({
      type: 'application/pdf',
      disposition: 'attachment; filename="boletin.pdf"',
    });
  });

  it.each(['getPortal', 'lookupReportCardPdf', 'lookupReportCard'])(
    '%s is public',
    (handler) => {
      expect(handlerMetadata(handler, IS_PUBLIC_KEY)).toBe(true);
    },
  );

  it.each(['lookupReportCard', 'lookupReportCardPdf'])(
    '%s is rate limited by IP',
    (handler) => {
      expect(handlerMetadata(handler, GUARDS_METADATA)).toEqual([
        PortalRateLimitGuard,
      ]);
    },
  );

  it('downloads the public PDF with a GET link', async () => {
    const dto = { documentNumber: '123', academicYearId: 'y1', periodId: 'p1' };

    const file = await controller.lookupReportCardPdf('colegio', dto);

    expect(handlerMetadata('lookupReportCardPdf', METHOD_METADATA)).toBe(
      RequestMethod.GET,
    );
    expect(handlerMetadata('lookupReportCardPdf', PATH_METADATA)).toBe(
      'public/organizations/:slug/report-card/pdf',
    );
    expect(service.lookupReportCardPdf).toHaveBeenCalledWith('colegio', dto);
    expect(file.getHeaders()).toMatchObject({ type: 'application/pdf' });
  });

  it('delegates', async () => {
    const dto = { documentNumber: '123', academicYearId: 'y1' };

    await controller.getEnrollmentReportCard('e1', auth);
    await controller.getPortal('colegio');
    await controller.lookupReportCard('colegio', dto);

    expect(service.getEnrollmentReportCard).toHaveBeenCalledWith(auth, 'e1');
    expect(service.getPublicPortal).toHaveBeenCalledWith('colegio');
    expect(service.lookupReportCard).toHaveBeenCalledWith('colegio', dto);
  });
});
