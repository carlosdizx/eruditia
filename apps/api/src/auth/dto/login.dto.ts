import {
  IsEmail,
  IsNotEmpty,
  IsStrongPassword,
  MaxLength,
} from 'class-validator';

export default class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsStrongPassword()
  @MaxLength(128)
  password: string;
}
