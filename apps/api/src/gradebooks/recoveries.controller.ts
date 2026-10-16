import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import RecoveriesService from './recoveries.service';
import ListRecoveriesDto from './dto/list-recoveries.dto';
import SaveRecoveryDto from './dto/save-recovery.dto';

// El profesor recupera solo las materias que dicta; el admin, todas.
@Controller('recoveries')
@AuthWithPermissions({
  roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
  permissions: [PermissionEnum.GRADE_RECOVER],
})
export default class RecoveriesController {
  constructor(private readonly recoveriesService: RecoveriesService) {}

  @Get()
  public async listRecoveries(
    @Query() { academicYearId }: ListRecoveriesDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.recoveriesService.listRecoveries(auth, academicYearId);
  }

  @Put(':classroomSubjectId/students/:enrollmentId')
  public async saveRecovery(
    @Param('classroomSubjectId', ParseUUIDPipe) classroomSubjectId: string,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: SaveRecoveryDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.recoveriesService.saveRecovery(
      auth,
      classroomSubjectId,
      enrollmentId,
      dto,
    );
  }

  @Delete(':classroomSubjectId/students/:enrollmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteRecovery(
    @Param('classroomSubjectId', ParseUUIDPipe) classroomSubjectId: string,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    await this.recoveriesService.deleteRecovery(
      auth,
      classroomSubjectId,
      enrollmentId,
    );
  }
}
