import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import AuthService from './auth.service';
import LoginDto from './dto/login.dto';
import Public from './decorators/public.decorator';
import CurrentAuth from './decorators/current-auth.decorator';
import RequestMetadata from './decorators/request-metadata.decorator';
import type AuthContextInterface from './interfaces/auth-context.interface';
import type RequestMetadataInterface from './interfaces/request-metadata.interface';

@Controller('auth')
export default class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  public async login(
    @Body() dto: LoginDto,
    @RequestMetadata() metadata: RequestMetadataInterface,
  ) {
    return await this.authService.login(dto, metadata);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(@CurrentAuth() auth: AuthContextInterface) {
    await this.authService.logout(auth);
  }

  @Get('me')
  public async me(@CurrentAuth() auth: AuthContextInterface) {
    return await this.authService.me(auth);
  }
}
