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
import SubjectsService from './subjects.service';
import CreateSubjectDto from './dto/create-subject.dto';
import UpdateSubjectDto from './dto/update-subject.dto';

@Controller('subjects')
export default class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.SUBJECT_LIST],
  })
  @Get()
  public async listSubjects(@CurrentAuth() auth: AuthContextInterface) {
    return await this.subjectsService.listSubjects(auth);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.SUBJECT_CREATE],
  })
  @Post()
  public async createSubject(
    @Body() dto: CreateSubjectDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.subjectsService.createSubject(auth, dto);
  }

  // Materias base de las áreas obligatorias.
  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.SUBJECT_CREATE],
  })
  @HttpCode(HttpStatus.OK)
  @Post('standard')
  public async loadStandardSubjects(@CurrentAuth() auth: AuthContextInterface) {
    return await this.subjectsService.loadStandardSubjects(auth);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.SUBJECT_UPDATE],
  })
  @Patch(':subjectId')
  public async updateSubject(
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Body() dto: UpdateSubjectDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.subjectsService.updateSubject(auth, subjectId, dto);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.SUBJECT_DELETE],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':subjectId')
  public async deleteSubject(
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    await this.subjectsService.deleteSubject(auth, subjectId);
  }
}
