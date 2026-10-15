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
import ClassroomsService from './classrooms.service';
import CreateClassroomDto from './dto/create-classroom.dto';
import UpdateClassroomDto from './dto/update-classroom.dto';
import ListClassroomsDto from './dto/list-classrooms.dto';

@Controller('classrooms')
export default class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.CLASSROOM_LIST],
  })
  @Get()
  public async listClassrooms(
    @Query() dto: ListClassroomsDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.classroomsService.listClassrooms(auth, dto);
  }

  // Antes de :classroomId para que "teachers" no se tome como id.
  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [
      PermissionEnum.CLASSROOM_CREATE,
      PermissionEnum.CLASSROOM_UPDATE,
    ],
    mode: 'any',
  })
  @Get('teachers')
  public async listTeachers(@CurrentAuth() auth: AuthContextInterface) {
    return await this.classroomsService.listTeachers(auth);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.CLASSROOM_LIST],
  })
  @Get(':classroomId')
  public async findClassroom(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.classroomsService.findClassroom(auth, classroomId);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.CLASSROOM_CREATE],
  })
  @Post()
  public async createClassroom(
    @Body() dto: CreateClassroomDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.classroomsService.createClassroom(auth, dto);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.CLASSROOM_UPDATE],
  })
  @Patch(':classroomId')
  public async updateClassroom(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Body() dto: UpdateClassroomDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.classroomsService.updateClassroom(auth, classroomId, dto);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.CLASSROOM_DELETE],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':classroomId')
  public async deleteClassroom(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    await this.classroomsService.deleteClassroom(auth, classroomId);
  }
}
