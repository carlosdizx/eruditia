import { Module } from '@nestjs/common';
import OrganizationsService from './organizations.service';
import OrganizationRepository from './organization.repository';

@Module({
  providers: [OrganizationRepository, OrganizationsService],
  exports: [OrganizationsService],
})
export default class OrganizationsModule {}
