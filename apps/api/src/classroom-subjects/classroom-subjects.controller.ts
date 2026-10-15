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
  Query,
} from '@nestjs/common';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import ClassroomSubjectsService from './classroom-subjects.service';
import AssignSubjectDto from './dto/assign-subject.dto';
import UpdateClassroomSubjectDto from './dto/update-classroom-subject.dto';
import CopyStructureDto from './dto/copy-structure.dto';
import ListMyAssignmentsDto from './dto/list-my-assignments.dto';

@Controller()
export default class ClassroomSubjectsController {
  constructor(
    private readonly classroomSubjectsService: ClassroomSubjectsService,
  ) {}

  // Del profesor en sesión: solo sus salones y materias.
  @AuthWithPermissions({
    roles: [RoleNameEnum.TEACHER],
    permissions: [PermissionEnum.CLASSROOM_SUBJECT_LIST],
  })
  @Get('teaching-assignments')
  public async listMyAssignments(
    @Query() { academicYearId }: ListMyAssignmentsDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.classroomSubjectsService.listMyAssignments(
      auth,
      academicYearId,
    );
  }

  // "Copiar salones y materias del año anterior".
  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [
      PermissionEnum.CLASSROOM_CREATE,
      PermissionEnum.CLASSROOM_SUBJECT_ASSIGN,
    ],
  })
  @HttpCode(HttpStatus.OK)
  @Post('classrooms/copy-structure')
  public async copyStructure(
    @Body() dto: CopyStructureDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.classroomSubjectsService.copyStructure(auth, dto);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.CLASSROOM_SUBJECT_LIST],
  })
  @Get('classrooms/:classroomId/subjects')
  public async listClassroomSubjects(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.classroomSubjectsService.listClassroomSubjects(
      auth,
      classroomId,
    );
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.CLASSROOM_SUBJECT_ASSIGN],
  })
  @Post('classrooms/:classroomId/subjects')
  public async assignSubject(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Body() dto: AssignSubjectDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.classroomSubjectsService.assignSubject(
      auth,
      classroomId,
      dto,
    );
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.CLASSROOM_SUBJECT_ASSIGN],
  })
  @Patch('classrooms/:classroomId/subjects/:assignmentId')
  public async updateClassroomSubject(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: UpdateClassroomSubjectDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.classroomSubjectsService.updateClassroomSubject(
      auth,
      classroomId,
      assignmentId,
      dto,
    );
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.CLASSROOM_SUBJECT_ASSIGN],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('classrooms/:classroomId/subjects/:assignmentId')
  public async removeClassroomSubject(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    await this.classroomSubjectsService.removeClassroomSubject(
      auth,
      classroomId,
      assignmentId,
    );
  }
}
