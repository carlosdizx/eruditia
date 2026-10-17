import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import GetRankingOptionsDto from './get-ranking-options.dto';
import { MAX_RANKING_LIMIT } from './get-ranking.dto';

export const HONOR_ROLL_GROUPS = ['classroom', 'gradeLevel'] as const;

export default class GetHonorRollDto extends GetRankingOptionsDto {
  // Sin periodo se usa el acumulado anual.
  @IsOptional()
  @IsUUID()
  periodId?: string;

  // Top N de cada salón o grado (con los empatados del último puesto).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_RANKING_LIMIT)
  limit?: number;

  // Excluye a quienes perdieron al menos una materia.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  onlyAllPassed?: boolean;

  @IsOptional()
  @IsIn(HONOR_ROLL_GROUPS)
  groupBy?: (typeof HONOR_ROLL_GROUPS)[number];
}
