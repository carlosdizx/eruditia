import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { Auth } from '@common/config/auth.config';
import OrganizationRole from '@auth/enums/organization-role.enum';
import CreateOrganizationUserDto from '@dto/create-organization-user.dto';
import UserAccountsService, {
  UserAccount,
} from '@services/user-accounts.service';

export interface CreatedOrganizationUser extends UserAccount {
  organizationId: string;
  role: OrganizationRole;
}

@Injectable()
export default class OrganizationUsersService {
  constructor(
    private readonly authService: AuthService<Auth>,
    private readonly userAccountsService: UserAccountsService,
  ) {}

  // Creates the user account and adds it to `organizationId` with the given
  // role. If the membership fails, the account is removed so no user exists
  // outside an organization.
  public async create(
    organizationId: string,
    dto: CreateOrganizationUserDto,
  ): Promise<CreatedOrganizationUser> {
    const user = await this.userAccountsService.create(dto);

    try {
      // Server-side call (no headers): addMember is not exposed over HTTP
      // and trusts its caller — the RolesGuard on the endpoint is what
      // restricts it to organization admins.
      await this.authService.api.addMember({
        body: { userId: user.id, organizationId, role: dto.role },
      });
    } catch (error) {
      await this.userAccountsService.remove(user.id);
      throw error;
    }

    return { ...user, organizationId, role: dto.role };
  }
}
