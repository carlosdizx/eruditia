import { Controller, Get, Query } from '@nestjs/common';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import RankingsService from './rankings.service';
import GetRankingDto from './dto/get-ranking.dto';
import GetRankingOptionsDto from './dto/get-ranking-options.dto';
import GetSubjectLeadersDto from './dto/get-subject-leaders.dto';

// El admin ve todos los rankings; el profesor, los de su dirección de grupo y
// los de las materias que dicta.
@Controller('rankings')
@AuthWithPermissions({
  roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
  permissions: [PermissionEnum.RANKING_VIEW],
})
export default class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get('options')
  public async getOptions(
    @Query() { academicYearId }: GetRankingOptionsDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.rankingsService.getOptions(auth, academicYearId);
  }

  @Get('subject-leaders')
  public async getSubjectLeaders(
    @Query() dto: GetSubjectLeadersDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.rankingsService.getSubjectLeaders(auth, dto);
  }

  @Get()
  public async getRanking(
    @Query() dto: GetRankingDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.rankingsService.getRanking(auth, dto);
  }
}
