import { Body, Controller, Post } from '@nestjs/common';
import OrganizationRole from '@auth/enums/organization-role.enum';
import RequireRoles from '@auth/decorators/require-roles.decorator';
import ActiveOrganizationId from '@auth/decorators/active-organization-id.decorator';
import CreateOrganizationUserDto from '@dto/create-organization-user.dto';
import OrganizationUsersService from '@services/organization-users.service';

@Controller('organizations/users')
export default class OrganizationUsersController {
  constructor(
    private readonly organizationUsersService: OrganizationUsersService,
  ) {}

  // Users are always created in the organization of the admin creating
  // them — it comes from their session, never from the request body.
  @Post()
  @RequireRoles(OrganizationRole.ADMIN)
  public async create(
    @ActiveOrganizationId() organizationId: string,
    @Body() dto: CreateOrganizationUserDto,
  ) {
    return await this.organizationUsersService.create(organizationId, dto);
  }
}
