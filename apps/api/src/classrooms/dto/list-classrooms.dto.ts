import { IsOptional, IsUUID } from 'class-validator';

// Los salones siempre se consultan dentro de un año lectivo.
export default class ListClassroomsDto {
  @IsUUID()
  academicYearId: string;

  @IsOptional()
  @IsUUID()
  gradeLevelId?: string;
}
