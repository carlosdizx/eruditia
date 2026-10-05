import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import LoginDto from '@auth/dto/login.dto';
import { generateFriendlyPassword } from '@common/utils/password.util';

const validPayload = { email: 'ana@example.com', password: 'abcd-efgh-ijkl' };

const getErrorProperties = async (payload: Record<string, unknown>) => {
  const errors = await validate(plainToClass(LoginDto, payload));
  return errors.map(({ property }) => property);
};

describe('LoginDto', () => {
  it('passes validation with a valid payload', async () => {
    await expect(getErrorProperties(validPayload)).resolves.toEqual([]);
  });

  it('rejects an invalid email', async () => {
    await expect(
      getErrorProperties({ ...validPayload, email: 'not-an-email' }),
    ).resolves.toEqual(['email']);
  });

  it.each([
    ['empty', ''],
    ['not a string', 12345],
    ['longer than 128 characters', 'a'.repeat(129)],
  ])('rejects a password that is %s', async (_label, password) => {
    await expect(
      getErrorProperties({ ...validPayload, password }),
    ).resolves.toEqual(['password']);
  });

  // Antes exigía fortaleza y rechazaba ~15% de las contraseñas temporales.
  it('accepts temporary passwords without digits or uppercase letters', async () => {
    await expect(
      getErrorProperties({ ...validPayload, password: 'abcd-efgh-ijkm' }),
    ).resolves.toEqual([]);
  });

  it('accepts every generated temporary password', async () => {
    const passwords = Array.from({ length: 200 }, () =>
      generateFriendlyPassword(),
    );

    const results = await Promise.all(
      passwords.map((password) =>
        getErrorProperties({ ...validPayload, password }),
      ),
    );

    expect(results.flat()).toEqual([]);
  });
});
