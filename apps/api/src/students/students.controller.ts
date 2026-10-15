import {
  Body,
  Controller,
  Get,
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
import StudentsService from './students.service';
import CreateStudentDto from './dto/create-student.dto';
import UpdateStudentDto from './dto/update-student.dto';
import ListStudentsDto from './dto/list-students.dto';

@Controller('students')
export default class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.STUDENT_LIST],
  })
  @Get()
  public async listStudents(
    @Query() dto: ListStudentsDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.studentsService.listStudents(auth, dto);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.STUDENT_LIST],
  })
  @Get(':studentId')
  public async findStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.studentsService.findStudent(auth, studentId);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.STUDENT_CREATE],
  })
  @Post()
  public async createStudent(
    @Body() dto: CreateStudentDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.studentsService.createStudent(auth, dto);
  }

  // También cambia el estado (activo, retirado, graduado, suspendido).
  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.STUDENT_UPDATE],
  })
  @Patch(':studentId')
  public async updateStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: UpdateStudentDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.studentsService.updateStudent(auth, studentId, dto);
  }
}
