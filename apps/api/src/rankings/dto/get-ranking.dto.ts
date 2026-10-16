import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import GetRankingOptionsDto from './get-ranking-options.dto';

export const MAX_RANKING_LIMIT = 500;

export default class GetRankingDto extends GetRankingOptionsDto {
  // Sin periodo se calcula el acumulado anual.
  @IsOptional()
  @IsUUID()
  periodId?: string;

  @IsOptional()
  @IsUUID()
  gradeLevelId?: string;

  @IsOptional()
  @IsUUID()
  classroomId?: string;

  // Con materia se ordena por su nota; sin ella, por el promedio general.
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  // Top N: incluye a los empatados en el último puesto. Sin límite, todos.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_RANKING_LIMIT)
  limit?: number;

  // Solo quienes aprueban la materia (o todas, en el ranking general).
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  onlyAllPassed?: boolean;
}
