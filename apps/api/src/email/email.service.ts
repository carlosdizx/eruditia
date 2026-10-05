import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import SendEmailDto from '@email/dto/send-email.dto';
import Env from '@common/schemas/env.schema';

@Injectable()
export default class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService<Env, true>) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const secure = this.configService.get<boolean>('SMTP_SECURE');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
    this.transporter
      .verify()
      .then(() => this.logger.debug('Connected to email successfully'))
      .catch((error) =>
        this.logger.error('Could not connect to email server', error),
      );
  }

  public main = async ({ from, to, subject, html }: SendEmailDto) => {
    this.logger.debug(`Sending email to: ${to}`);
    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(`Error sending email to: ${to}`, error);
      throw new InternalServerErrorException('Error sending email');
    }
  };
}
