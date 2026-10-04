import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Op, Transaction } from 'sequelize';
import Env from '@common/schemas/env.schema';
import CrudService from '@database/services/crud.service';
import UserSessionModel from '@database/models/user-session.model';
import UserModel from '@database/models/user.model';
import RoleModel from '@database/models/role.model';
import OrganizationModel from '@database/models/organization.model';
import UserSessionRepository from './user-session.repository';
import {
  generateSessionToken,
  hashSessionToken,
} from '../utils/session-token.util';
import canAuthenticate from '../utils/can-authenticate.util';
import AuthContextInterface from '../interfaces/auth-context.interface';
import RequestMetadataInterface from '../interfaces/request-metadata.interface';
import {
  INVALID_SESSION_MESSAGE,
  SESSION_NOT_FOUND_MESSAGE,
} from '../constants/auth-messages.constant';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
export const ACTIVITY_TOUCH_INTERVAL_MS = MINUTE_MS;

@Injectable()
export default class SessionsService extends CrudService<
  UserSessionModel,
  UserSessionRepository
> {
  constructor(
    protected readonly repository: UserSessionRepository,
    private readonly configService: ConfigService<Env, true>,
  ) {
    super(repository);
  }

  private get ttlMs() {
    return (
      this.configService.get('SESSION_TTL_HOURS', { infer: true }) * HOUR_MS
    );
  }

  private get idleTimeoutMs() {
    return (
      this.configService.get('SESSION_IDLE_TIMEOUT_MINUTES', { infer: true }) *
      MINUTE_MS
    );
  }

  private isUsable = (session: UserSessionModel, now: Date) =>
    !session.revokedAt &&
    session.expiresAt.getTime() > now.getTime() &&
    session.lastActivityAt.getTime() + this.idleTimeoutMs > now.getTime();

  public createSession = async (
    user: Pick<UserModel, 'id' | 'organizationId'>,
    metadata: RequestMetadataInterface,
    transaction?: Transaction,
  ) => {
    const token = generateSessionToken();
    const now = new Date();

    const session = await this.create(
      {
        userId: user.id,
        organizationId: user.organizationId,
        tokenHash: hashSessionToken(token),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        expiresAt: new Date(now.getTime() + this.ttlMs),
        lastActivityAt: now,
      },
      { transaction },
    );

    return { token, session };
  };

  // Sin caché a propósito: es lo que hace que un logout o una suspensión
  // tengan efecto en la siguiente petición.
  public validateSession = async (
    token: string,
  ): Promise<AuthContextInterface> => {
    const now = new Date();

    const session = await this.findOne(
      { tokenHash: hashSessionToken(token) },
      false,
      {
        include: [
          {
            model: UserModel,
            attributes: ['id', 'roleId', 'status', 'isActive'],
            include: [
              { model: RoleModel, attributes: ['id', 'name', 'category'] },
            ],
          },
          { model: OrganizationModel, attributes: ['id', 'isActive'] },
        ],
      },
    );

    const user = session?.user;
    const role = user?.role;

    if (!session || !user || !role || !this.isUsable(session, now))
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);

    if (!canAuthenticate({ ...user, organization: session.organization }))
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);

    if (
      now.getTime() - session.lastActivityAt.getTime() >=
      ACTIVITY_TOUCH_INTERVAL_MS
    )
      await this.repository.touch(session.id, now);

    return {
      sessionId: session.id,
      userId: user.id,
      organizationId: session.organizationId,
      roleId: role.id,
      roleName: role.name,
      roleCategory: role.category,
      expiresAt: session.expiresAt,
    };
  };

  public listActiveSessions = async (userId: string) => {
    const now = Date.now();

    return await this.findAll(
      {
        userId,
        revokedAt: null,
        expiresAt: { [Op.gt]: new Date(now) },
        lastActivityAt: { [Op.gt]: new Date(now - this.idleTimeoutMs) },
      },
      {
        attributes: [
          'id',
          'ipAddress',
          'userAgent',
          'createdAt',
          'lastActivityAt',
          'expiresAt',
        ],
        order: [['lastActivityAt', 'DESC']],
      },
    );
  };

  public revokeSession = async (sessionId: string, userId: string) => {
    const revoked = await this.repository.revokeMany({ id: sessionId, userId });

    if (!revoked) throw new NotFoundException(SESSION_NOT_FOUND_MESSAGE);
  };

  public revokeAllSessions = async (
    userId: string,
    exceptSessionId?: string,
  ) => {
    return await this.repository.revokeMany({
      userId,
      ...(exceptSessionId && { id: { [Op.ne]: exceptSessionId } }),
    });
  };
}
