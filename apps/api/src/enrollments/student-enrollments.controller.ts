import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import EnrollmentsService from './enrollments.service';

@Controller('students/:studentId/enrollments')
export default class StudentEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  // Historial año a año. El profesor, solo de sus estudiantes.
  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
    permissions: [PermissionEnum.ENROLLMENT_LIST],
  })
  @Get()
  public async listStudentHistory(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.enrollmentsService.listStudentHistory(auth, studentId);
  }
}
