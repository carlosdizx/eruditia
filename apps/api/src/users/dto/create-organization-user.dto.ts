import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

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
}
