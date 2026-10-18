import { ConfigService } from '@nestjs/config';
import { SequelizeModuleOptions } from '@nestjs/sequelize';
import Env from '@common/schemas/env.schema';
import databaseOptionsUtil from '@database/util/database-options.util';

const sequelizeConfigFactory = (
  configService: ConfigService<Env, true>,
): SequelizeModuleOptions => ({
  ...databaseOptionsUtil({
    DB_HOST: configService.get('DB_HOST', { infer: true }),
    DB_PORT: configService.get('DB_PORT', { infer: true }),
    DB_USERNAME: configService.get('DB_USERNAME', { infer: true }),
    DB_PASSWORD: configService.get('DB_PASSWORD', { infer: true }),
    DB_NAME: configService.get('DB_NAME', { infer: true }),
    DB_LOGGING: configService.get('DB_LOGGING', { infer: true }),
  }),
  synchronize: false,
});

export default sequelizeConfigFactory;
