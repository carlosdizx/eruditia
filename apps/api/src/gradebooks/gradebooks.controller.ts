import {
  Body,
  Controller,
  Get,
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
import GradebooksService from './gradebooks.service';
import GetGradebookDto from './dto/get-gradebook.dto';
import SetEvaluationItemsDto from './dto/set-evaluation-items.dto';
import SaveGradesDto from './dto/save-grades.dto';

// El profesor solo las materias que dicta (y en lectura las de su dirección
// de grupo); el admin, todas las de su organización.
@Controller()
@AuthWithPermissions({ roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER] })
export default class GradebooksController {
  constructor(private readonly gradebooksService: GradebooksService) {}

  @AuthWithPermissions({ permissions: [PermissionEnum.GRADE_LIST] })
  @Get('classrooms/:classroomId/gradebooks')
  public async listClassroomGradebooks(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.gradebooksService.listClassroomGradebooks(
      auth,
      classroomId,
    );
  }

  @AuthWithPermissions({ permissions: [PermissionEnum.GRADE_LIST] })
  @Get('gradebooks/:classroomSubjectId')
  public async getGradebook(
    @Param('classroomSubjectId', ParseUUIDPipe) classroomSubjectId: string,
    @Query() { periodId }: GetGradebookDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.gradebooksService.getGradebook(
      auth,
      classroomSubjectId,
      periodId,
    );
  }

  @AuthWithPermissions({ permissions: [PermissionEnum.GRADE_RECORD] })
  @Put('gradebooks/:classroomSubjectId/periods/:periodId/items')
  public async setEvaluationItems(
    @Param('classroomSubjectId', ParseUUIDPipe) classroomSubjectId: string,
    @Param('periodId', ParseUUIDPipe) periodId: string,
    @Body() dto: SetEvaluationItemsDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.gradebooksService.setEvaluationItems(
      auth,
      classroomSubjectId,
      periodId,
      dto,
    );
  }

  @AuthWithPermissions({ permissions: [PermissionEnum.GRADE_RECORD] })
  @Put('gradebooks/:classroomSubjectId/periods/:periodId/grades')
  public async saveGrades(
    @Param('classroomSubjectId', ParseUUIDPipe) classroomSubjectId: string,
    @Param('periodId', ParseUUIDPipe) periodId: string,
    @Body() dto: SaveGradesDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.gradebooksService.saveGrades(
      auth,
      classroomSubjectId,
      periodId,
      dto,
    );
  }
}
