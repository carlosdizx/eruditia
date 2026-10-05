import { Module } from '@nestjs/common';
import OrganizationsController from './organizations.controller';
import OrganizationsService from './organizations.service';
import OrganizationRepository from './organization.repository';
import UsersModule from '../users/users.module';
import RolesModule from '../roles/roles.module';

@Module({
  imports: [UsersModule, RolesModule],
  providers: [OrganizationRepository, OrganizationsService],
  exports: [OrganizationsService],
  controllers: [OrganizationsController],
})
export default class OrganizationsModule {}
