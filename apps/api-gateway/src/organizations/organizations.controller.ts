import { Body, Controller, Post } from '@nestjs/common';
import CreateOrganizationDto from './dto/create-organization.dto';
import CreateUserDto from '../users/dto/create-user.dto';

@Controller('organizations')
export default class OrganizationsController {
  @Post()
  public registerOrganization(
    @Body('organization') createOrganizationDto: CreateOrganizationDto,
    @Body('owner') createUserDto: CreateUserDto,
  ) {
    return { createOrganizationDto, createUserDto };
  }
}
