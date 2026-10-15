import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Negativos para preescolar (Prejardín -2, Jardín -1, Transición 0).
export const MIN_SEQUENCE_ORDER = -5;
export const MAX_SEQUENCE_ORDER = 30;

export default class CreateGradeLevelDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  shortName: string;

  @IsInt()
  @Min(MIN_SEQUENCE_ORDER)
  @Max(MAX_SEQUENCE_ORDER)
  sequenceOrder: number;

  @IsOptional()
  @IsBoolean()
  isFinalGrade?: boolean;
}
