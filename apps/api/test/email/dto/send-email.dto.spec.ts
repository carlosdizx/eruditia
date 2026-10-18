import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import SendEmailDto from '@email/dto/send-email.dto';

const validPayload = {
  from: 'sender@gmail.com',
  to: 'receiver@gmail.com',
  subject: 'Subject',
  html: '<p>Hello</p>',
};

const getErrorProperties = async (payload: Record<string, unknown>) => {
  const errors = await validate(plainToClass(SendEmailDto, payload));
  return errors.map(({ property }) => property);
};

describe('SendEmailDto', () => {
  it('passes validation with a valid payload', async () => {
    await expect(getErrorProperties(validPayload)).resolves.toEqual([]);
  });

  describe('from', () => {
    it('is optional', async () => {
      const payload: Record<string, unknown> = { ...validPayload };
      delete payload.from;

      await expect(getErrorProperties(payload)).resolves.toEqual([]);
    });
  });

  describe('to', () => {
    it.each(['not-an-email', 'user@', ''])('rejects "%s"', async (to) => {
      await expect(
        getErrorProperties({ ...validPayload, to }),
      ).resolves.toEqual(['to']);
    });

    it('rejects a missing value', async () => {
      const payload: Record<string, unknown> = { ...validPayload };
      delete payload.to;

      await expect(getErrorProperties(payload)).resolves.toEqual(['to']);
    });
  });

  describe.each(['subject', 'html'])('%s', (key) => {
    it('rejects an empty value', async () => {
      await expect(
        getErrorProperties({ ...validPayload, [key]: '' }),
      ).resolves.toEqual([key]);
    });

    it('rejects a missing value', async () => {
      const payload: Record<string, unknown> = { ...validPayload };
      delete payload[key];

      await expect(getErrorProperties(payload)).resolves.toEqual([key]);
    });
  });
});
