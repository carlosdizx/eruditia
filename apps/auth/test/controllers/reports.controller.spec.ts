import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import FeatureGuard from '@auth/guards/feature.guard';
import RolesGuard from '@auth/guards/roles.guard';
import {
  REQUIRED_FEATURES_KEY,
  REQUIRED_ROLES_KEY,
} from '@auth/constants/auth-metadata.constants';
import ReportsController from '@controllers/reports.controller';
import ReportsService from '@services/reports.service';

const handler = (): object =>
  Object.getOwnPropertyDescriptor(
    ReportsController.prototype,
    'getFinancialReport',
  )?.value as object;

describe('ReportsController', () => {
  const reportsService = { getFinancialReport: jest.fn() };
  const controller = new ReportsController(
    reportsService as unknown as ReportsService,
  );

  it('is served at GET /reports/financial', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ReportsController)).toBe(
      'reports',
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler())).toBe('financial');
    expect(Reflect.getMetadata(METHOD_METADATA, handler())).toBe(
      RequestMethod.GET,
    );
  });

  it('requires the finance module', () => {
    expect(Reflect.getMetadata(REQUIRED_FEATURES_KEY, handler())).toEqual([
      'finance_module',
    ]);
  });

  it('requires an admin or supervisor role', () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, handler())).toEqual([
      'admin',
      'supervisor',
    ]);
  });

  it('checks the feature before the role', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, handler())).toEqual([
      FeatureGuard,
      RolesGuard,
    ]);
  });

  it('returns the report of the active organization', () => {
    const report = { organizationId: 'org-1' };
    reportsService.getFinancialReport.mockReturnValue(report);

    expect(controller.getFinancialReport('org-1')).toBe(report);
    expect(reportsService.getFinancialReport).toHaveBeenCalledWith('org-1');
  });
});
