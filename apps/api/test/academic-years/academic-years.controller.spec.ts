import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import AcademicYearsController from '../../src/academic-years/academic-years.controller';
import AcademicYearsService from '../../src/academic-years/academic-years.service';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

const handlerMetadata = (handler: string, key: string): unknown =>
  Reflect.getMetadata(
    key,
    Object.getOwnPropertyDescriptor(AcademicYearsController.prototype, handler)!
      .value as object,
  );

describe('AcademicYearsController', () => {
  let service: Record<string, jest.Mock>;
  let controller: AcademicYearsController;

  const auth = authContextFixture();

  beforeEach(() => {
    service = Object.fromEntries(
      [
        'listAcademicYears',
        'findAcademicYear',
        'createAcademicYear',
        'updateAcademicYear',
        'activateAcademicYear',
        'setAcademicPeriods',
        'updateAcademicPeriod',
        'deleteAcademicYear',
      ].map((name) => [name, jest.fn().mockResolvedValue({ id: 'year-id' })]),
    );
    controller = new AcademicYearsController(
      service as unknown as AcademicYearsService,
    );
  });

  describe.each([
    ['listAcademicYears', PermissionEnum.ACADEMIC_YEAR_LIST],
    ['findAcademicYear', PermissionEnum.ACADEMIC_YEAR_LIST],
    ['createAcademicYear', PermissionEnum.ACADEMIC_YEAR_CREATE],
    ['updateAcademicYear', PermissionEnum.ACADEMIC_YEAR_UPDATE],
    ['activateAcademicYear', PermissionEnum.ACADEMIC_YEAR_UPDATE],
    ['setAcademicPeriods', PermissionEnum.ACADEMIC_YEAR_UPDATE],
    ['updateAcademicPeriod', PermissionEnum.ACADEMIC_YEAR_UPDATE],
    ['deleteAcademicYear', PermissionEnum.ACADEMIC_YEAR_DELETE],
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

  it('delegates every action with the current organization', async () => {
    const periods = { periods: [{ name: 'P', weightPercentage: 100 }] };

    await controller.listAcademicYears(auth);
    await controller.findAcademicYear('year-id', auth);
    await controller.updateAcademicYear('year-id', { name: '2027' }, auth);
    await controller.activateAcademicYear('year-id', auth);
    await controller.setAcademicPeriods('year-id', periods, auth);
    await controller.updateAcademicPeriod(
      'year-id',
      'period-id',
      { isOpenForGrading: true },
      auth,
    );

    expect(service.listAcademicYears).toHaveBeenCalledWith(auth);
    expect(service.findAcademicYear).toHaveBeenCalledWith(auth, 'year-id');
    expect(service.updateAcademicYear).toHaveBeenCalledWith(auth, 'year-id', {
      name: '2027',
    });
    expect(service.activateAcademicYear).toHaveBeenCalledWith(auth, 'year-id');
    expect(service.setAcademicPeriods).toHaveBeenCalledWith(
      auth,
      'year-id',
      periods,
    );
    expect(service.updateAcademicPeriod).toHaveBeenCalledWith(
      auth,
      'year-id',
      'period-id',
      { isOpenForGrading: true },
    );
  });

  it('deletes and returns nothing', async () => {
    await expect(
      controller.deleteAcademicYear('year-id', auth),
    ).resolves.toBeUndefined();
    expect(service.deleteAcademicYear).toHaveBeenCalledWith(auth, 'year-id');
  });
});
