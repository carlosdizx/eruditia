import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import VerifyTwoFactorDto from '@auth/dto/verify-two-factor.dto';

const validPayload = {
  challengeId: '0199b6a4-0000-7000-8000-000000000001',
  code: '012345',
};

const getErrorProperties = async (payload: Record<string, unknown>) => {
  const errors = await validate(plainToClass(VerifyTwoFactorDto, payload));
  return errors.map(({ property }) => property);
};

describe('VerifyTwoFactorDto', () => {
  it('passes validation with a valid payload', async () => {
    await expect(getErrorProperties(validPayload)).resolves.toEqual([]);
  });

  it.each([
    ['missing', undefined],
    ['not a UUID', 'challenge-1'],
  ])('rejects a challengeId that is %s', async (_label, challengeId) => {
    await expect(
      getErrorProperties({ ...validPayload, challengeId }),
    ).resolves.toEqual(['challengeId']);
  });

  it.each([
    ['missing', undefined],
    ['too short', '12345'],
    ['too long', '1234567'],
    ['not numeric', '12a456'],
    ['padded with spaces', ' 123456'],
    ['a number instead of a string', 123456],
  ])('rejects a code that is %s', async (_label, code) => {
    await expect(
      getErrorProperties({ ...validPayload, code }),
    ).resolves.toEqual(['code']);
  });
});
