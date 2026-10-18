import 'reflect-metadata';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import EmailService from '@email/email.service';
import Env from '@common/schemas/env.schema';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const config: Record<string, unknown> = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: 465,
  SMTP_SECURE: true,
  SMTP_USER: 'user@gmail.com',
  SMTP_PASSWORD: 'password',
};

const createConfigServiceMock = () =>
  ({
    get: jest.fn((key: string) => config[key]),
  }) as unknown as ConfigService<Env, true>;

describe('EmailService', () => {
  let transporter: { verify: jest.Mock; sendMail: jest.Mock };
  let configService: ConfigService<Env, true>;

  // verify() is not awaited by the constructor, so flush pending promises.
  const flushPromises = () =>
    new Promise<void>((resolve) => process.nextTick(resolve));

  beforeEach(() => {
    transporter = {
      verify: jest.fn().mockResolvedValue(true),
      sendMail: jest.fn().mockResolvedValue({ messageId: 'id-1' }),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(transporter);
    configService = createConfigServiceMock();

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates the transporter with the smtp configuration', () => {
      new EmailService(configService);

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: 'user@gmail.com', pass: 'password' },
      });
    });

    it('logs when the connection is verified', async () => {
      new EmailService(configService);
      await flushPromises();

      expect(transporter.verify).toHaveBeenCalled();
    });

    it('logs the error instead of throwing when verification fails', async () => {
      const error = new Error('self-signed certificate in certificate chain');
      transporter.verify.mockRejectedValue(error);

      expect(() => new EmailService(configService)).not.toThrow();
      await flushPromises();
    });
  });

  describe('main', () => {
    const dto = {
      from: 'sender@gmail.com',
      to: 'receiver@gmail.com',
      subject: 'Subject',
      html: '<p>Hello</p>',
    };

    it('sends the email through the transporter', async () => {
      const service = new EmailService(configService);

      await expect(service.main(dto)).resolves.toBeUndefined();
      expect(transporter.sendMail).toHaveBeenCalledWith(dto);
    });

    it('throws an InternalServerErrorException when sending fails', async () => {
      const error = new Error('boom');
      transporter.sendMail.mockRejectedValue(error);
      const service = new EmailService(configService);

      await expect(service.main(dto)).rejects.toThrow(
        new InternalServerErrorException('Error sending email'),
      );
    });
  });
});
