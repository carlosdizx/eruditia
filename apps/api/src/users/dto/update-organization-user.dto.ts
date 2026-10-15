import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

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
}
