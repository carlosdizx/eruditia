import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { Request } from 'express';
import { TOO_MANY_LOOKUPS_MESSAGE } from '../constants/report-card-messages.constant';

// Consultas del portal por IP: frena los barridos de documentos sin bloquear
// al acudiente que se equivoca al digitar.
export const PORTAL_WINDOW_MS = 60 * 1000;
export const MAX_PORTAL_LOOKUPS = 30;

interface LookupWindow {
  count: number;
  resetAt: number;
}

@Injectable()
export default class PortalRateLimitGuard implements CanActivate {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const { ip } = context.switchToHttp().getRequest<Request>();
    const key = `report-card-portal:${ip ?? 'unknown'}`;
    const now = Date.now();

    const stored = await this.cache.get<LookupWindow>(key);
    const window =
      stored && stored.resetAt > now
        ? stored
        : { count: 0, resetAt: now + PORTAL_WINDOW_MS };
    if (window.count >= MAX_PORTAL_LOOKUPS)
      throw new HttpException(
        TOO_MANY_LOOKUPS_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );

    await this.cache.set(
      key,
      { ...window, count: window.count + 1 },
      window.resetAt - now,
    );
    return true;
  }
}
