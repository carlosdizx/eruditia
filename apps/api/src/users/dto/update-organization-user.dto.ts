import {
  IsBoolean,
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
} from '../constants/user-validation.constant';

// El correo no se edita: es la identidad de login y el canal del 2FA.
export default class UpdateOrganizationUserDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  // Desactivar corta su acceso en la siguiente petición.
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // null borra el dato.
  @IsOptional()
  @Matches(DOCUMENT_NUMBER_PATTERN, {
    message: INVALID_DOCUMENT_NUMBER_MESSAGE,
  })
  documentNumber?: string | null;

  @IsOptional()
  @Matches(PHONE_PATTERN, { message: INVALID_PHONE_MESSAGE })
  phone?: string | null;
}
