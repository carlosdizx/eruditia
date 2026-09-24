import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import SuperAdminGuard from '@auth/guards/super-admin.guard';
import CreateOrganizationDto from '@dto/create-organization.dto';
import SystemOrganizationsService from '@services/system-organizations.service';

@Controller('system/organizations')
@UseGuards(SuperAdminGuard)
export default class SystemOrganizationsController {
  constructor(
    private readonly systemOrganizationsService: SystemOrganizationsService,
  ) {}

  @Post()
  public async create(@Body() dto: CreateOrganizationDto) {
    return await this.systemOrganizationsService.create(dto);
  }
}
