import { IsOptional, IsUUID } from 'class-validator';

export default class ReportCardPeriodDto {
  // Boletín de ese periodo; sin periodo, el informe final del año.
  @IsOptional()
  @IsUUID()
  periodId?: string;
}
