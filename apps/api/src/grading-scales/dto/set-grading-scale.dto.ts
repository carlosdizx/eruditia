import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export const MAX_SCORE_LIMIT = 100;
export const DECIMAL_PLACES_OPTIONS = [1, 2];
export const MAX_FAILED_SUBJECTS_LIMIT = 50;

export default class SetGradingScaleDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_SCORE_LIMIT)
  minScore: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_SCORE_LIMIT)
  maxScore: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_SCORE_LIMIT)
  passingScore: number;

  @IsInt()
  @IsIn(DECIMAL_PLACES_OPTIONS)
  decimalPlaces: number;

  // Materias reprobadas con las que se reprueba el año; null o ausente: las
  // materias perdidas no reprueban el año.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_FAILED_SUBJECTS_LIMIT)
  maxFailedSubjects?: number | null;

  // También reprueba el año con el promedio general bajo la aprobatoria.
  @IsOptional()
  @IsBoolean()
  failByAverage?: boolean;
}
