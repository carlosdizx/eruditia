import { Module } from '@nestjs/common';
import RolesService from './roles.service';
import RoleRepository from './role.repository';

@Module({
  providers: [RoleRepository, RolesService],
  exports: [RolesService],
})
export default class RolesModule {}
