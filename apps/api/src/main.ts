import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import AppModule, { ObserveInstrument } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import Env from './common/schemas/env.schema';
import { ConfigService } from '@nestjs/config';
import { format } from 'util';

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
    bufferLogs: true,
  });

  const configService = app.get(ConfigService<Env, true>);

  // La web llama a la API desde su servidor: por defecto se confía en
  // X-Forwarded-For solo si viene de la red privada, para tener la IP real del
  // navegador sin que un cliente externo la falsifique.
  app.set('trust proxy', configService.get('TRUST_PROXY', { infer: true }));

  const terminalLogger = new Logger('AUX LOGGER');

  console.log = (...data: any[]) => terminalLogger.log(format(...data));
  console.debug = (...data: any[]) => terminalLogger.debug(format(...data));
  console.info = (...data: any[]) => terminalLogger.verbose(format(...data));
  console.error = (...data: any[]) => terminalLogger.error(format(...data));
  console.warn = (...data: any[]) => terminalLogger.warn(format(...data));

  app.useLogger(configService.get('LOG_LEVELS', { infer: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const logger = new Logger('App Bootstrap');

  logger.verbose('Starting App 🟡');

  const port = configService.get('PORT', { infer: true });

  await app.listen(port);
  logger.verbose(`Started App on port ${port} 🟢`);
};

bootstrap().catch((error: unknown) => {
  console.error('Failed to start App 🔴', error);
  process.exit(1);
});
