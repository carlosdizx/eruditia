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
import {
  MAX_SEQUENCE_ORDER,
  MIN_SEQUENCE_ORDER,
} from './create-grade-level.dto';

export default class UpdateGradeLevelDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  shortName?: string;

  @IsOptional()
  @IsInt()
  @Min(MIN_SEQUENCE_ORDER)
  @Max(MAX_SEQUENCE_ORDER)
  sequenceOrder?: number;

  @IsOptional()
  @IsBoolean()
  isFinalGrade?: boolean;
}
