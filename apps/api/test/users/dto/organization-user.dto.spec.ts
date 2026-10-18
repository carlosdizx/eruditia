import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import CreateOrganizationUserDto from '../../../src/users/dto/create-organization-user.dto';
import UpdateOrganizationUserDto from '../../../src/users/dto/update-organization-user.dto';

const errorsOf = async <T extends object>(
  cls: new () => T,
  plain: Record<string, unknown>,
) =>
  (await validate(plainToInstance(cls, plain))).map(({ property }) => property);

describe('CreateOrganizationUserDto', () => {
  const valid = {
    firstName: 'Ana',
    lastName: 'Lopez',
    email: 'ana@example.com',
    roleId: randomUUID(),
  };

  it('accepts a complete user', async () => {
    await expect(errorsOf(CreateOrganizationUserDto, valid)).resolves.toEqual(
      [],
    );
  });

  it('requires the role', async () => {
    const { roleId: _roleId, ...withoutRole } = valid;

    await expect(
      errorsOf(CreateOrganizationUserDto, withoutRole),
    ).resolves.toEqual(['roleId']);
  });

  it('rejects an invalid email and empty names', async () => {
    await expect(
      errorsOf(CreateOrganizationUserDto, {
        ...valid,
        email: 'no-es-correo',
        firstName: '',
      }),
    ).resolves.toEqual(expect.arrayContaining(['email', 'firstName']));
  });

  it('accepts an optional document and phone', async () => {
    await expect(
      errorsOf(CreateOrganizationUserDto, {
        ...valid,
        documentNumber: '1020-3040',
        phone: '+57 300 123 4567',
      }),
    ).resolves.toEqual([]);
  });

  it('rejects a malformed document and phone', async () => {
    await expect(
      errorsOf(CreateOrganizationUserDto, {
        ...valid,
        documentNumber: '12.345 678',
        phone: 'llámame',
      }),
    ).resolves.toEqual(['documentNumber', 'phone']);
  });
});

describe('UpdateOrganizationUserDto', () => {
  it('accepts a partial update', async () => {
    await expect(
      errorsOf(UpdateOrganizationUserDto, { isActive: false }),
    ).resolves.toEqual([]);
  });

  it('rejects empty names, an invalid role and a non boolean isActive', async () => {
    await expect(
      errorsOf(UpdateOrganizationUserDto, {
        firstName: '',
        roleId: 'x',
        isActive: 'no',
      }),
    ).resolves.toEqual(['firstName', 'roleId', 'isActive']);
  });

  it('accepts null to clear the document and phone', async () => {
    await expect(
      errorsOf(UpdateOrganizationUserDto, {
        documentNumber: null,
        phone: null,
      }),
    ).resolves.toEqual([]);
  });
});
