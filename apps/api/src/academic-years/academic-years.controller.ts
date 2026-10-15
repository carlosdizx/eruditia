import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import AcademicYearsService from './academic-years.service';
import CreateAcademicYearDto from './dto/create-academic-year.dto';
import UpdateAcademicYearDto from './dto/update-academic-year.dto';
import SetAcademicPeriodsDto from './dto/set-academic-periods.dto';
import UpdateAcademicPeriodDto from './dto/update-academic-period.dto';

@Controller('academic-years')
export default class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ACADEMIC_YEAR_LIST],
  })
  @Get()
  public async listAcademicYears(@CurrentAuth() auth: AuthContextInterface) {
    return await this.academicYearsService.listAcademicYears(auth);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ACADEMIC_YEAR_LIST],
  })
  @Get(':yearId')
  public async findAcademicYear(
    @Param('yearId', ParseUUIDPipe) yearId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.academicYearsService.findAcademicYear(auth, yearId);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ACADEMIC_YEAR_CREATE],
  })
  @Post()
  public async createAcademicYear(
    @Body() dto: CreateAcademicYearDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.academicYearsService.createAcademicYear(auth, dto);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ACADEMIC_YEAR_UPDATE],
  })
  @Patch(':yearId')
  public async updateAcademicYear(
    @Param('yearId', ParseUUIDPipe) yearId: string,
    @Body() dto: UpdateAcademicYearDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.academicYearsService.updateAcademicYear(
      auth,
      yearId,
      dto,
    );
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ACADEMIC_YEAR_UPDATE],
  })
  @HttpCode(HttpStatus.OK)
  @Post(':yearId/activate')
  public async activateAcademicYear(
    @Param('yearId', ParseUUIDPipe) yearId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.academicYearsService.activateAcademicYear(auth, yearId);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ACADEMIC_YEAR_UPDATE],
  })
  @Put(':yearId/periods')
  public async setAcademicPeriods(
    @Param('yearId', ParseUUIDPipe) yearId: string,
    @Body() dto: SetAcademicPeriodsDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.academicYearsService.setAcademicPeriods(
      auth,
      yearId,
      dto,
    );
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ACADEMIC_YEAR_UPDATE],
  })
  @Patch(':yearId/periods/:periodId')
  public async updateAcademicPeriod(
    @Param('yearId', ParseUUIDPipe) yearId: string,
    @Param('periodId', ParseUUIDPipe) periodId: string,
    @Body() dto: UpdateAcademicPeriodDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.academicYearsService.updateAcademicPeriod(
      auth,
      yearId,
      periodId,
      dto,
    );
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ACADEMIC_YEAR_DELETE],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':yearId')
  public async deleteAcademicYear(
    @Param('yearId', ParseUUIDPipe) yearId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    await this.academicYearsService.deleteAcademicYear(auth, yearId);
  }
}
