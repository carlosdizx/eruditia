import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

type DatabaseClock = { time: Date; timezone: string };

@Injectable()
export default class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  public check = async () => {
    const server = {
      time: new Date(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    try {
      const [database] = await this.sequelize.query<DatabaseClock>(
        `SELECT NOW() AS time, current_setting('TimeZone') AS timezone`,
        { type: QueryTypes.SELECT },
      );

      return { status: 'ok', server, database };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      throw new ServiceUnavailableException({
        status: 'error',
        server,
        database: null,
      });
    }
  };
}
