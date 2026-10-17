import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import SubjectConceptsService from './subject-concepts.service';
import SetSubjectConceptsDto from './dto/set-subject-concepts.dto';

// Los conceptos se leen con la planilla (GET /gradebooks/:id); aquí se
// configuran con las mismas reglas que el ingreso de notas.
@Controller('gradebooks/:classroomSubjectId')
@AuthWithPermissions({
  roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
  permissions: [PermissionEnum.GRADE_RECORD],
})
export default class SubjectConceptsController {
  constructor(
    private readonly subjectConceptsService: SubjectConceptsService,
  ) {}

  @Get('concept-sources')
  public async listSources(
    @Param('classroomSubjectId', ParseUUIDPipe) classroomSubjectId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.subjectConceptsService.listSources(
      auth,
      classroomSubjectId,
    );
  }

  @Put('periods/:periodId/concepts')
  public async setConcepts(
    @Param('classroomSubjectId', ParseUUIDPipe) classroomSubjectId: string,
    @Param('periodId', ParseUUIDPipe) periodId: string,
    @Body() dto: SetSubjectConceptsDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.subjectConceptsService.setConcepts(
      auth,
      classroomSubjectId,
      periodId,
      dto,
    );
  }
}
