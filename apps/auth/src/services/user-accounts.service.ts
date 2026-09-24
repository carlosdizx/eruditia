import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { Auth } from '@common/config/auth.config';
import UserAccountDto from '@dto/user-account.dto';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
}

// Creates and removes user accounts server-side. Public sign-up is
// disabled, so this is the only way users come into existence; callers are
// responsible for checking who may do it (see the controllers' guards).
@Injectable()
export default class UserAccountsService {
  constructor(private readonly authService: AuthService<Auth>) {}

  public async create(dto: UserAccountDto): Promise<UserAccount> {
    // No headers: a server-side call, not bound to the caller's session, so
    // the admin() plugin doesn't require a system admin to perform it.
    const { user } = await this.authService.api.createUser({
      body: { name: dto.name, email: dto.email, password: dto.password },
    });

    return { id: user.id, name: user.name, email: user.email };
  }

  // Compensation for a failed multi-step creation. Better Auth has no
  // server-side "delete user" without an admin session, so this goes through
  // its internal adapter (accounts and sessions cascade in the database).
  public async remove(userId: string): Promise<void> {
    const context = await this.authService.instance.$context;

    await context.internalAdapter.deleteUser(userId);
  }
}
