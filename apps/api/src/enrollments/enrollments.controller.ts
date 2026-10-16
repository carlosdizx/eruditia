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
} from '@nestjs/common';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import EnrollmentsService from './enrollments.service';
import EnrollStudentsDto from './dto/enroll-students.dto';
import UpdateEnrollmentDto from './dto/update-enrollment.dto';

@Controller('classrooms/:classroomId/enrollments')
export default class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  // El profesor, solo de los salones donde dicta.
  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
    permissions: [PermissionEnum.ENROLLMENT_LIST],
  })
  @Get()
  public async listClassroomEnrollments(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.enrollmentsService.listClassroomEnrollments(
      auth,
      classroomId,
    );
  }

  // Estudiantes que aún no tienen salón en el año del salón.
  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ENROLLMENT_CREATE],
  })
  @Get('candidates')
  public async listCandidates(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.enrollmentsService.listCandidates(auth, classroomId);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ENROLLMENT_CREATE],
  })
  @Post()
  public async enrollStudents(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Body() dto: EnrollStudentsDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.enrollmentsService.enrollStudents(auth, classroomId, dto);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ENROLLMENT_UPDATE],
  })
  @Patch(':enrollmentId')
  public async updateEnrollment(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: UpdateEnrollmentDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.enrollmentsService.updateEnrollment(
      auth,
      classroomId,
      enrollmentId,
      dto,
    );
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ENROLLMENT_DELETE],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':enrollmentId')
  public async removeEnrollment(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    await this.enrollmentsService.removeEnrollment(
      auth,
      classroomId,
      enrollmentId,
    );
  }
}
