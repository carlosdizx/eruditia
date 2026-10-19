import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import CommonModule from '@common/common.module';
import EmailModule from '@email/email.module';
import UsersModule from '../../users/users.module';
import UsersService from '../../users/users.service';

// Solo lo necesario para crear el usuario y enviarle la contraseña temporal.
@Module({ imports: [CommonModule, EmailModule, UsersModule] })
class SuperAdminModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(SuperAdminModule);

  try {
    await app.get(UsersService).ensureSuperAdmin();
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
