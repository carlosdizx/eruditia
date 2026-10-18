import { IsUUID } from 'class-validator';

// Copia salones y materias de un año a otro (ej. 2026 -> 2027).
export default class CopyStructureDto {
  @IsUUID()
  sourceAcademicYearId: string;

  @IsUUID()
  targetAcademicYearId: string;
}
