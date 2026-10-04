import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export default class SendEmailDto {
  @IsNotEmpty()
  @IsOptional()
  from: string;

  @IsEmail()
  to: string;

  @IsNotEmpty()
  subject: string;

  @IsNotEmpty()
  html: string;
}
