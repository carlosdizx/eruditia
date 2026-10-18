import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import Public from '@auth/decorators/public.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import ReportCardsService, { type ReportCardPdf } from './report-cards.service';
import GetReportCardDto from './dto/get-report-card.dto';
import LookupReportCardDto from './dto/lookup-report-card.dto';
import GetReportCardPdfDto from './dto/get-report-card-pdf.dto';
import LookupReportCardPdfDto from './dto/lookup-report-card-pdf.dto';
import ReportCardPeriodDto from './dto/report-card-period.dto';

const download = ({ filename, content }: ReportCardPdf) =>
  new StreamableFile(content, {
    type: 'application/pdf',
    disposition: `attachment; filename="${filename}"`,
    length: content.length,
  });

// Admin o director de grupo del salón (el profesor, solo de su dirección).
const STAFF_EXPORT = {
  roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
  permissions: [PermissionEnum.REPORT_CARD_EXPORT],
};

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

  @AuthWithPermissions({
    roles: [RoleNameEnum.STUDENT],
    permissions: [PermissionEnum.REPORT_CARD_VIEW],
  })
  @Get('report-cards/me/pdf')
  public async getOwnReportCardPdf(
    @Query() dto: GetReportCardPdfDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return download(
      await this.reportCardsService.getOwnReportCardPdf(auth, dto),
    );
  }

  @AuthWithPermissions(STAFF_EXPORT)
  @Get('enrollments/:enrollmentId/report-card/pdf')
  public async getEnrollmentReportCardPdf(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Query() { periodId }: ReportCardPeriodDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return download(
      await this.reportCardsService.getEnrollmentReportCardPdf(
        auth,
        enrollmentId,
        periodId,
      ),
    );
  }

  @AuthWithPermissions(STAFF_EXPORT)
  @Get('classrooms/:classroomId/report-cards/periods')
  public async listClassroomPeriods(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.reportCardsService.listClassroomPeriods(
      auth,
      classroomId,
    );
  }

  @AuthWithPermissions(STAFF_EXPORT)
  @Get('classrooms/:classroomId/report-cards/pdf')
  public async getClassroomReportCardsPdf(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Query() { periodId }: ReportCardPeriodDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return download(
      await this.reportCardsService.getClassroomReportCardsPdf(
        auth,
        classroomId,
        periodId,
      ),
    );
  }

  // Admin o director de grupo del salón de la matrícula.
  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
    permissions: [PermissionEnum.REPORT_CARD_VIEW],
  })
  @Get('enrollments/:enrollmentId/report-card')
  public async getEnrollmentReportCard(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.reportCardsService.getEnrollmentReportCard(
      auth,
      enrollmentId,
    );
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

  @Public()
  @Post('public/report-cards/:slug/pdf')
  @HttpCode(HttpStatus.OK)
  public async lookupReportCardPdf(
    @Param('slug') slug: string,
    @Body() dto: LookupReportCardPdfDto,
  ) {
    return download(
      await this.reportCardsService.lookupReportCardPdf(slug, dto),
    );
  }
}
