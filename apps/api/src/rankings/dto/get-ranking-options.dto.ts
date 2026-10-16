import { IsOptional, IsUUID } from 'class-validator';

export default class GetRankingOptionsDto {
  // Sin año se usa el activo de la organización.
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}
