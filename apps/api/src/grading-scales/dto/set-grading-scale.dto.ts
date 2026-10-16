import { IsIn, IsInt, IsNumber, Max, Min } from 'class-validator';

export const MAX_SCORE_LIMIT = 100;
export const DECIMAL_PLACES_OPTIONS = [1, 2];

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
}
