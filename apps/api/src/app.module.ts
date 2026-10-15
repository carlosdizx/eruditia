import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigService } from '@nestjs/config';
import CommonModule from './common/common.module';
import Env from './common/schemas/env.schema';
import OrganizationsModule from './organizations/organizations.module';
import UsersModule from './users/users.module';
import TwoFactorModule from './two-factor/two-factor.module';
import RolesModule from './roles/roles.module';
import EmailModule from './email/email.module';
import AuthModule from './auth/auth.module';
import PermissionsModule from './permissions/permissions.module';
import StudentsModule from './students/students.module';
import AcademicYearsModule from './academic-years/academic-years.module';
import GradeLevelsModule from './grade-levels/grade-levels.module';
import ClassroomsModule from './classrooms/classrooms.module';
import SubjectsModule from './subjects/subjects.module';
import ClassroomSubjectsModule from './classroom-subjects/classroom-subjects.module';
import EnrollmentsModule from './enrollments/enrollments.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    CommonModule,
    ObserveModule.forRootAsync({
      imports: [CommonModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        appKey: configService.get('OBSERVE_APP_KEY', { infer: true }),
        appSecret: configService.get('OBSERVE_APP_SECRET', { infer: true }),
        serviceId: configService.get('OBSERVE_SERVICE_ID', { infer: true }),
      }),
    }),
    OrganizationsModule,
    UsersModule,
    TwoFactorModule,
    RolesModule,
    EmailModule,
    PermissionsModule,
    StudentsModule,
    AcademicYearsModule,
    GradeLevelsModule,
    ClassroomsModule,
    SubjectsModule,
    ClassroomSubjectsModule,
    EnrollmentsModule,
    AuthModule,
  ],
})
export default class AppModule {}
