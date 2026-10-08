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
import CreateOrganizationDto from './dto/create-organization.dto';
import UpdateOrganizationDto from './dto/update-organization.dto';
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

  @Get(':organizationId')
  public findOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.organizationsService.findOrganization(organizationId);
  }

  @Patch(':organizationId')
  public updateOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateOrganization(organizationId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':organizationId')
  public deleteOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.organizationsService.deleteOrganization(organizationId);
  }

  @Patch(':organizationId/restore')
  public restoreOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.organizationsService.restoreOrganization(organizationId);
  }
}
