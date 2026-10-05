import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import CreateOrganizationDto from './dto/create-organization.dto';
import CreateUserDto from '../users/dto/create-user.dto';
import OrganizationsService from './organizations.service';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import RoleNameEnum from '@common/enums/role-name.enum';
import PaginationDto from '@common/dto/pagination.dto';

@Controller('organizations')
@AuthWithPermissions({ roles: [RoleNameEnum.SUPER_ADMIN] })
export default class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  public registerOrganization(
    @Body('organization') createOrganizationDto: CreateOrganizationDto,
    @Body('owner') createUserDto: CreateUserDto,
  ) {
    return this.organizationsService.registerOrganizationAndOwner(
      createOrganizationDto,
      createUserDto,
    );
  }

  @Get()
  public listOrganizations(@Query() dto: PaginationDto) {
    return this.organizationsService.findAllPaginated(dto);
  }
}
