import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import PromotionsService from './promotions.service';
import PromotionPreviewDto from './dto/promotion-preview.dto';
import PromoteStudentsDto from './dto/promote-students.dto';

// Asistente de promoción anual.
@Controller('promotions')
export default class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ENROLLMENT_PROMOTE],
  })
  @Get('preview')
  public async preview(
    @Query() dto: PromotionPreviewDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.promotionsService.preview(auth, dto);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.ENROLLMENT_PROMOTE],
  })
  @Post()
  public async promote(
    @Body() dto: PromoteStudentsDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.promotionsService.promote(auth, dto);
  }
}
