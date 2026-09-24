import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import Env from '@common/schemas/env.schema';
import sequelizeConfigFactory from '@database/config/sequelize.config';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) =>
        sequelizeConfigFactory(configService),
    }),
  ],
})
export default class DatabaseModule {}
