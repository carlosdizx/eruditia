import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { Auth } from '@common/config/auth.config';
import OrganizationMetadata from '@common/schemas/organization-metadata.schema';
import parseOrganizationMetadata from '@common/utils/parse-organization-metadata.util';
import CreateOrganizationDto from '@dto/create-organization.dto';
import UserAccountsService, {
  UserAccount,
} from '@services/user-accounts.service';

export interface CreatedOrganization {
  id: string;
  name: string;
  slug: string;
  features: string[];
  createdAt: Date;
  admin: UserAccount;
}

@Injectable()
export default class SystemOrganizationsService {
  constructor(
    private readonly authService: AuthService<Auth>,
    private readonly userAccountsService: UserAccountsService,
  ) {}

  // Creates the organization's admin user, then the organization with that
  // user as its creator (so they join it with the `admin` role). If the
  // organization can't be created, the user is removed so no orphan account
  // is left behind.
  public async create(
    dto: CreateOrganizationDto,
  ): Promise<CreatedOrganization> {
    const admin = await this.userAccountsService.create(dto.admin);

    try {
      const metadata: OrganizationMetadata = { features: dto.features };

      // `userId` without headers is a "system action": Better Auth creates
      // it on behalf of that user even though users can't create
      // organizations themselves (allowUserToCreateOrganization: false).
      const organization = await this.authService.api.createOrganization({
        body: { name: dto.name, slug: dto.slug, metadata, userId: admin.id },
      });

      if (!organization) {
        throw new InternalServerErrorException('Organization was not created');
      }

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        features: parseOrganizationMetadata(organization.metadata).features,
        createdAt: organization.createdAt,
        admin,
      };
    } catch (error) {
      await this.userAccountsService.remove(admin.id);
      throw error;
    }
  }
}
