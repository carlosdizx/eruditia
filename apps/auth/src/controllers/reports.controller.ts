import { Controller, Get } from '@nestjs/common';
import Feature from '@auth/enums/feature.enum';
import OrganizationRole from '@auth/enums/organization-role.enum';
import RequireFeature from '@auth/decorators/require-feature.decorator';
import RequireRoles from '@auth/decorators/require-roles.decorator';
import ActiveOrganizationId from '@auth/decorators/active-organization-id.decorator';
import ReportsService from '@services/reports.service';

@Controller('reports')
export default class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Decorators apply bottom-up, so FeatureGuard (closest to the method) runs
  // first: an organization without the finance module gets 403 regardless
  // of the role of the user.
  @Get('financial')
  @RequireRoles(OrganizationRole.ADMIN, OrganizationRole.SUPERVISOR)
  @RequireFeature(Feature.FINANCE_MODULE)
  public getFinancialReport(@ActiveOrganizationId() organizationId: string) {
    return this.reportsService.getFinancialReport(organizationId);
  }
}
