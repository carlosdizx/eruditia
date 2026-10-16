import { IsOptional, IsUUID } from 'class-validator';

export default class GetReportCardDto {
  // Sin año se muestra el más reciente en el que tiene matrícula.
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}
