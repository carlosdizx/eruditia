import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export default class UserAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
