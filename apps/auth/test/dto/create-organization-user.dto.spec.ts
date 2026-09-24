import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import CreateOrganizationUserDto from '@dto/create-organization-user.dto';

const validBody = {
  name: 'Grace',
  email: 'grace@acme.com',
  password: 'secret123',
  role: 'supervisor',
};

const errorsFor = async (body: Record<string, unknown>) => {
  const errors = await validate(
    plainToInstance(CreateOrganizationUserDto, body),
  );

  return errors.map((error) => error.property).sort();
};

describe('CreateOrganizationUserDto', () => {
  it.each(['admin', 'supervisor', 'member'])(
    'accepts the %s role',
    async (role) => {
      await expect(errorsFor({ ...validBody, role })).resolves.toEqual([]);
    },
  );

  it.each(['owner', 'superadmin', ''])('rejects the %p role', async (role) => {
    await expect(errorsFor({ ...validBody, role })).resolves.toEqual(['role']);
  });

  it('rejects a missing role', async () => {
    const { role: _role, ...body } = validBody;

    await expect(errorsFor(body)).resolves.toEqual(['role']);
  });

  it('validates the account fields it inherits', async () => {
    await expect(
      errorsFor({ ...validBody, name: '', email: 'nope', password: 'short' }),
    ).resolves.toEqual(['email', 'name', 'password']);
  });
});
