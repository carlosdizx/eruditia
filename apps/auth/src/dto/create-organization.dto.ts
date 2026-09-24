import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import Feature from '@auth/enums/feature.enum';
import UserAccountDto from '@dto/user-account.dto';

export default class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and single hyphens',
  })
  slug: string;

  @IsArray()
  @ArrayUnique()
  @IsEnum(Feature, { each: true })
  features: Feature[];

  // The organization's first admin — the one who then creates its employees.
  @IsObject()
  @ValidateNested()
  @Type(() => UserAccountDto)
  admin: UserAccountDto;
}
