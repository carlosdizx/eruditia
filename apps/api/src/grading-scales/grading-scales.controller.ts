import { Body, Controller, Get, Put } from '@nestjs/common';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import GradingScalesService from './grading-scales.service';
import SetGradingScaleDto from './dto/set-grading-scale.dto';

@Controller('grading-scale')
export default class GradingScalesController {
  constructor(private readonly gradingScalesService: GradingScalesService) {}

  // Cualquier usuario de la organización: profesores y estudiantes la
  // necesitan para validar y pintar las notas.
  @Get()
  public async getGradingScale(@CurrentAuth() auth: AuthContextInterface) {
    return await this.gradingScalesService.getScale(auth);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.GRADING_SCALE_UPDATE],
  })
  @Put()
  public async setGradingScale(
    @Body() dto: SetGradingScaleDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.gradingScalesService.setScale(auth, dto);
  }
}
