import { IsOptional, IsUUID } from 'class-validator';

// Sin año, el activo de la organización.
export default class ListMyAssignmentsDto {
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}
