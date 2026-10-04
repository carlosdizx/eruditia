import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import SessionsService from './sessions.service';
import CurrentAuth from '../decorators/current-auth.decorator';
import type AuthContextInterface from '../interfaces/auth-context.interface';

@Controller('auth/sessions')
export default class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  public async listSessions(@CurrentAuth() auth: AuthContextInterface) {
    return await this.sessionsService.listActiveSessions(auth.userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  public async revokeOtherSessions(@CurrentAuth() auth: AuthContextInterface) {
    await this.sessionsService.revokeAllSessions(auth.userId, auth.sessionId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async revokeSession(
    @CurrentAuth() auth: AuthContextInterface,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.sessionsService.revokeSession(id, auth.userId);
  }
}
