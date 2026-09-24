import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import CreateOrganizationDto from '@dto/create-organization.dto';

const validBody = {
  name: 'Acme',
  slug: 'acme-corp',
  features: ['finance_module', 'reports:advanced'],
  admin: { name: 'Ada', email: 'ada@acme.com', password: 'secret123' },
};

const errorsFor = async (body: Record<string, unknown>) => {
  const errors = await validate(plainToInstance(CreateOrganizationDto, body));

  return errors.map((error) => error.property);
};

describe('CreateOrganizationDto', () => {
  it('accepts a valid body', async () => {
    await expect(errorsFor(validBody)).resolves.toEqual([]);
  });

  it('accepts an organization without features', async () => {
    await expect(errorsFor({ ...validBody, features: [] })).resolves.toEqual(
      [],
    );
  });

  it.each(['Acme Corp', 'acme--corp', '-acme', 'ACME', ''])(
    'rejects the slug %p',
    async (slug) => {
      await expect(errorsFor({ ...validBody, slug })).resolves.toEqual([
        'slug',
      ]);
    },
  );

  it('rejects an unknown feature', async () => {
    await expect(
      errorsFor({ ...validBody, features: ['time-travel'] }),
    ).resolves.toEqual(['features']);
  });

  it('rejects repeated features', async () => {
    await expect(
      errorsFor({
        ...validBody,
        features: ['finance_module', 'finance_module'],
      }),
    ).resolves.toEqual(['features']);
  });

  it('rejects a missing name', async () => {
    await expect(errorsFor({ ...validBody, name: '' })).resolves.toEqual([
      'name',
    ]);
  });

  it('validates the nested admin account', async () => {
    const errors = await validate(
      plainToInstance(CreateOrganizationDto, {
        ...validBody,
        admin: { name: 'Ada', email: 'not-an-email', password: 'short' },
      }),
    );

    expect(errors.map((error) => error.property)).toEqual(['admin']);
    expect(errors[0].children?.map((child) => child.property).sort()).toEqual([
      'email',
      'password',
    ]);
  });

  it('rejects a missing admin account', async () => {
    const { admin: _admin, ...body } = validBody;

    await expect(errorsFor(body)).resolves.toEqual(['admin']);
  });
});
