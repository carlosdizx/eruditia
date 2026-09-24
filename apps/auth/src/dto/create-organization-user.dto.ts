import { IsEnum } from 'class-validator';
import OrganizationRole from '@auth/enums/organization-role.enum';
import UserAccountDto from '@dto/user-account.dto';

export default class CreateOrganizationUserDto extends UserAccountDto {
  @IsEnum(OrganizationRole)
  role: OrganizationRole;
}
