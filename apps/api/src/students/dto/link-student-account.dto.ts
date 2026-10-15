import { IsEmail } from 'class-validator';

export default class LinkStudentAccountDto {
  @IsEmail()
  email: string;
}
