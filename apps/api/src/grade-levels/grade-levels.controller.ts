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
import GradeLevelsService from './grade-levels.service';
import CreateGradeLevelDto from './dto/create-grade-level.dto';
import UpdateGradeLevelDto from './dto/update-grade-level.dto';

@Controller('grade-levels')
export default class GradeLevelsController {
  constructor(private readonly gradeLevelsService: GradeLevelsService) {}

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.GRADE_LEVEL_LIST],
  })
  @Get()
  public async listGradeLevels(@CurrentAuth() auth: AuthContextInterface) {
    return await this.gradeLevelsService.listGradeLevels(auth);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.GRADE_LEVEL_CREATE],
  })
  @Post()
  public async createGradeLevel(
    @Body() dto: CreateGradeLevelDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.gradeLevelsService.createGradeLevel(auth, dto);
  }

  // Plantilla estándar: Transición, Primaria (1° a 5°) y Bachillerato (6° a 11°).
  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.GRADE_LEVEL_CREATE],
  })
  @HttpCode(HttpStatus.OK)
  @Post('standard')
  public async loadStandardGradeLevels(
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.gradeLevelsService.loadStandardGradeLevels(auth);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.GRADE_LEVEL_UPDATE],
  })
  @Patch(':gradeLevelId')
  public async updateGradeLevel(
    @Param('gradeLevelId', ParseUUIDPipe) gradeLevelId: string,
    @Body() dto: UpdateGradeLevelDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.gradeLevelsService.updateGradeLevel(
      auth,
      gradeLevelId,
      dto,
    );
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.GRADE_LEVEL_DELETE],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':gradeLevelId')
  public async deleteGradeLevel(
    @Param('gradeLevelId', ParseUUIDPipe) gradeLevelId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    await this.gradeLevelsService.deleteGradeLevel(auth, gradeLevelId);
  }
}
