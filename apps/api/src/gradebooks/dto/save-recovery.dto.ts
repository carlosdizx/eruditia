import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export default class SaveRecoveryDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
