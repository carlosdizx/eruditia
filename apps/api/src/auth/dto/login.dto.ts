import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export default class LoginDto {
  @IsEmail()
  email: string;

  // Sin reglas de fortaleza: la contraseña temporal generada no siempre las
  // cumple y bloquearía el primer login.
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
