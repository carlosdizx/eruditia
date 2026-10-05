import { Body, Controller, Post } from '@nestjs/common';
import CreateOrganizationDto from './dto/create-organization.dto';
import CreateUserDto from '../users/dto/create-user.dto';
import OrganizationsService from './organizations.service';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import RoleNameEnum from '@common/enums/role-name.enum';

@Controller('organizations')
export default class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @AuthWithPermissions({ roles: [RoleNameEnum.SUPER_ADMIN] })
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
}
