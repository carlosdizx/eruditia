import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { WhereOptions } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import UserSessionModel from '@database/models/user-session.model';
import { SESSION_NOT_FOUND_MESSAGE } from '../constants/auth-messages.constant';

@Injectable()
export default class UserSessionRepository extends AbstractRepository<UserSessionModel> {
  constructor() {
    super(UserSessionModel, {
      logger: new Logger(UserSessionRepository.name),
      findByPkNotFoundMessage: SESSION_NOT_FOUND_MESSAGE,
      findOneNotFoundMessage: SESSION_NOT_FOUND_MESSAGE,
    });
  }

  public async touch(id: string, lastActivityAt: Date): Promise<void> {
    try {
      await this.model.update({ lastActivityAt }, { where: { id } });
    } catch (error) {
      this.logger.error('Error touching session');
      this.logger.error(error);
      throw new ConflictException('No se pudo actualizar la sesión');
    }
  }

  public async revokeMany(
    query: WhereOptions<UserSessionModel>,
  ): Promise<number> {
    try {
      const [affected] = await this.model.update(
        { revokedAt: new Date() },
        { where: { ...query, revokedAt: null } as WhereOptions },
      );
      return affected;
    } catch (error) {
      this.logger.error('Error revoking sessions');
      this.logger.error(error);
      throw new ConflictException('No se pudieron revocar las sesiones');
    }
  }
}
