import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import validateEnv from '@common/config/env.config';
import DatabaseModule from '@database/database.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // En memoria por ahora; con varias instancias se cambia el store a Redis.
    CacheModule.register({ isGlobal: true }),
    DatabaseModule,
  ],
  exports: [ConfigModule],
})
export default class CommonModule {}
