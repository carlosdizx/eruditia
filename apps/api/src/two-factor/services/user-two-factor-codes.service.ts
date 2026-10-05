import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import UserTwoFactorCodeModel from '@database/models/user-two-factor-code.model';
import UserModel from '@database/models/user.model';
import CrudService from '@database/services/crud.service';
import Env from '@common/schemas/env.schema';
import EmailService from '@email/email.service';
import twoFactorCodeTemplate, {
  TWO_FACTOR_CODE_SUBJECT,
} from '@email/templates/two-factor-code.template';
import UserTwoFactorCodeRepository from '../repositories/user-two-factor-code.repository';
import {
  generateTwoFactorCode,
  hashTwoFactorCode,
  verifyTwoFactorCode,
} from '../utils/two-factor-code.util';
import {
  INVALID_TWO_FACTOR_CODE_MESSAGE,
  TWO_FACTOR_CODE_MAX_ATTEMPTS,
  TWO_FACTOR_CODE_TTL_MINUTES,
} from '../constants/two-factor.constant';

const MINUTE_MS = 60 * 1000;

@Injectable()
export default class UserTwoFactorCodesService extends CrudService<
  UserTwoFactorCodeModel,
  UserTwoFactorCodeRepository
> {
  constructor(
    protected readonly repository: UserTwoFactorCodeRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    super(repository);
  }

  private isUsable = (code: UserTwoFactorCodeModel, now: Date) =>
    !code.consumedAt &&
    code.expiresAt.getTime() > now.getTime() &&
    code.attempts < TWO_FACTOR_CODE_MAX_ATTEMPTS;

  // Cada código nuevo invalida los anteriores; si el correo no sale, se
  // revierte y no queda un código que nadie recibió.
  public issueEmailCode = async (
    user: Pick<UserModel, 'id' | 'email' | 'firstName'>,
  ) => {
    return await this.transaction(async (transaction) => {
      const now = new Date();
      const code = generateTwoFactorCode();

      await this.repository.invalidatePending(user.id, now, transaction);

      const record = await this.create(
        {
          userId: user.id,
          codeHash: hashTwoFactorCode(code),
          expiresAt: new Date(
            now.getTime() + TWO_FACTOR_CODE_TTL_MINUTES * MINUTE_MS,
          ),
        },
        { transaction },
      );

      await this.emailService.main({
        from: this.configService.get('SMTP_USER', { infer: true }),
        to: user.email,
        subject: TWO_FACTOR_CODE_SUBJECT,
        html: twoFactorCodeTemplate({
          firstName: user.firstName,
          code,
          expiresInMinutes: TWO_FACTOR_CODE_TTL_MINUTES,
        }),
      });

      return { challengeId: record.id, expiresAt: record.expiresAt };
    });
  };

  // Devuelve el dueño del código. Todo fallo responde igual para no revelar
  // si el reto existe, expiró o agotó sus intentos.
  public verifyCode = async (
    challengeId: string,
    code: string,
  ): Promise<string> => {
    const now = new Date();

    const record = await this.findByPk(challengeId, false, {
      attributes: [
        'id',
        'userId',
        'codeHash',
        'expiresAt',
        'attempts',
        'consumedAt',
      ],
    });

    if (!record || !this.isUsable(record, now))
      throw new UnauthorizedException(INVALID_TWO_FACTOR_CODE_MESSAGE);

    if (!verifyTwoFactorCode(code, record.codeHash)) {
      await this.repository.incrementAttempts(record.id);
      throw new UnauthorizedException(INVALID_TWO_FACTOR_CODE_MESSAGE);
    }

    if (!(await this.repository.consume(record.id, now)))
      throw new UnauthorizedException(INVALID_TWO_FACTOR_CODE_MESSAGE);

    return record.userId;
  };
}
