import { IsOptional, IsUUID } from 'class-validator';

export default class GetGradebookDto {
  // Sin periodo se abre el primero abierto para notas (o el último).
  @IsOptional()
  @IsUUID()
  periodId?: string;
}
