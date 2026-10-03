import 'reflect-metadata';
import OrganizationsController from '../../src/organizations/organizations.controller';
import OrganizationsService from '../../src/organizations/organizations.service';
import CreateOrganizationDto from '../../src/organizations/dto/create-organization.dto';
import CreateUserDto from '../../src/users/dto/create-user.dto';

describe('OrganizationsController', () => {
  let organizationsService: { registerOrganizationAndOwner: jest.Mock };
  let controller: OrganizationsController;

  const organizationDto = {
    name: 'Colegio X',
    slug: 'colegio-x',
  } as CreateOrganizationDto;

  const ownerDto: CreateUserDto = {
    firstName: 'Ana',
    lastName: 'Lopez',
    email: 'ana@example.com',
    roleId: 'admin-role-id',
  };

  beforeEach(() => {
    organizationsService = {
      registerOrganizationAndOwner: jest.fn().mockResolvedValue(undefined),
    };
    controller = new OrganizationsController(
      organizationsService as unknown as OrganizationsService,
    );
  });

  describe('registerOrganization', () => {
    it('passes the organization and owner bodies to the service', async () => {
      await controller.registerOrganization(organizationDto, ownerDto);

      expect(
        organizationsService.registerOrganizationAndOwner,
      ).toHaveBeenCalledWith(organizationDto, ownerDto);
    });

    it('propagates service errors', async () => {
      const error = new Error('boom');
      organizationsService.registerOrganizationAndOwner.mockRejectedValue(
        error,
      );

      await expect(
        controller.registerOrganization(organizationDto, ownerDto),
      ).rejects.toBe(error);
    });
  });
});
