import { Body, Controller, Post } from '@nestjs/common';
import CreateOrganizationDto from './dto/create-organization.dto';
import CreateUserDto from '../users/dto/create-user.dto';
import OrganizationsService from './organizations.service';

@Controller('organizations')
export default class OrganizationsController {

  constructor(private readonly organizationsService: OrganizationsService) { }

  @Post()
  public registerOrganization(
    @Body('organization') createOrganizationDto: CreateOrganizationDto,
    @Body('owner') createUserDto: CreateUserDto,
  ) {
    return this.organizationsService.registerOrganizationAndOwner(createOrganizationDto, createUserDto)
  }
}
