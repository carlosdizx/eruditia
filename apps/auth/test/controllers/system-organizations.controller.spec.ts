import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import SuperAdminGuard from '@auth/guards/super-admin.guard';
import Feature from '@auth/enums/feature.enum';
import SystemOrganizationsController from '@controllers/system-organizations.controller';
import SystemOrganizationsService from '@services/system-organizations.service';

const handler = (): object =>
  Object.getOwnPropertyDescriptor(
    SystemOrganizationsController.prototype,
    'create',
  )?.value as object;

describe('SystemOrganizationsController', () => {
  const systemOrganizationsService = { create: jest.fn() };
  const controller = new SystemOrganizationsController(
    systemOrganizationsService as unknown as SystemOrganizationsService,
  );

  it('is served at POST /system/organizations', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, SystemOrganizationsController),
    ).toBe('system/organizations');
    expect(Reflect.getMetadata(METHOD_METADATA, handler())).toBe(
      RequestMethod.POST,
    );
  });

  it('is protected by SuperAdminGuard', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, SystemOrganizationsController),
    ).toEqual([SuperAdminGuard]);
  });

  it('delegates the creation to the service', async () => {
    const dto = {
      name: 'Acme',
      slug: 'acme',
      features: [Feature.FINANCE_MODULE],
      admin: { name: 'Ada', email: 'ada@acme.com', password: 'secret123' },
    };
    const created = { id: 'org-1' };
    systemOrganizationsService.create.mockResolvedValue(created);

    await expect(controller.create(dto)).resolves.toBe(created);
    expect(systemOrganizationsService.create).toHaveBeenCalledWith(dto);
  });
});
