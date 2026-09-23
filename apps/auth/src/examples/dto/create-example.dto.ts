import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

export default class CreateExampleDto {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsBoolean()
  isActive: boolean = true;
}
