import { Module } from '@nestjs/common';
import RolesController from './roles.controller';
import RolesService from './roles.service';
import RoleRepository from './role.repository';

@Module({
  providers: [RoleRepository, RolesService],
  exports: [RolesService],
  controllers: [RolesController],
})
export default class RolesModule {}
