import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  DOCUMENT_NUMBER_PATTERN,
  INVALID_DOCUMENT_NUMBER_MESSAGE,
  INVALID_PHONE_MESSAGE,
  PHONE_PATTERN,
} from '@common/constants/contact-validation.constant';

// Alta de un usuario por el admin de su organización: a diferencia de
// CreateUserDto, el rol es obligatorio (no hay uno por defecto).
export default class CreateOrganizationUserDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  email: string;

  @IsUUID()
  roleId: string;

  @IsOptional()
  @Matches(DOCUMENT_NUMBER_PATTERN, {
    message: INVALID_DOCUMENT_NUMBER_MESSAGE,
  })
  documentNumber?: string;

  @IsOptional()
  @Matches(PHONE_PATTERN, { message: INVALID_PHONE_MESSAGE })
  phone?: string;
}
