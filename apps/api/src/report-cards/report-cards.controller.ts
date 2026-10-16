import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import Public from '@auth/decorators/public.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import ReportCardsService from './report-cards.service';
import GetReportCardDto from './dto/get-report-card.dto';
import LookupReportCardDto from './dto/lookup-report-card.dto';

@Controller()
export default class ReportCardsController {
  constructor(private readonly reportCardsService: ReportCardsService) {}

  @AuthWithPermissions({
    roles: [RoleNameEnum.STUDENT],
    permissions: [PermissionEnum.REPORT_CARD_VIEW],
  })
  @Get('report-cards/me')
  public async getOwnReportCard(
    @Query() { academicYearId }: GetReportCardDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.reportCardsService.getOwnReportCard(auth, academicYearId);
  }

  @Public()
  @Get('public/report-cards/:slug')
  public async getPortal(@Param('slug') slug: string) {
    return await this.reportCardsService.getPublicPortal(slug);
  }

  @Public()
  @Post('public/report-cards/:slug')
  @HttpCode(HttpStatus.OK)
  public async lookupReportCard(
    @Param('slug') slug: string,
    @Body() dto: LookupReportCardDto,
  ) {
    return await this.reportCardsService.lookupReportCard(slug, dto);
  }
}
