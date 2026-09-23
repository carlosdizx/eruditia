import { NestFactory } from '@nestjs/core';
import AppModule, { ObserveInstrument } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import Env from './common/schemas/env.schema';
import { ConfigService } from '@nestjs/config';
import { format } from 'util';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bufferLogs: true,
    bodyParser: false,
  });

  const configService = app.get(ConfigService<Env, true>);

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
