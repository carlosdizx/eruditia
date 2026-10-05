import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import UsersModule from '../users/users.module';
import PermissionsModule from '../permissions/permissions.module';
import AuthController from './auth.controller';
import AuthService from './auth.service';
import AuthGuard from './guards/auth.guard';
import AuthorizationGuard from './guards/authorization.guard';
import SessionsController from './sessions/sessions.controller';
import SessionsService from './sessions/sessions.service';
import UserSessionRepository from './sessions/user-session.repository';

@Module({
  imports: [UsersModule, PermissionsModule],
  controllers: [AuthController, SessionsController],
  providers: [
    UserSessionRepository,
    SessionsService,
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
  ],
  exports: [SessionsService],
})
export default class AuthModule {}
