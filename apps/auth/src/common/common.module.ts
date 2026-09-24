import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import validateEnv from '@common/config/env.config';
import DatabaseModule from '@database/database.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
  ],
  exports: [ConfigModule, DatabaseModule],
})
export default class CommonModule {}
