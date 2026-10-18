import { IsOptional, IsUUID } from 'class-validator';
import LookupReportCardDto from './lookup-report-card.dto';

export default class LookupReportCardPdfDto extends LookupReportCardDto {
  // Boletín de ese periodo; sin periodo, el informe final del año.
  @IsOptional()
  @IsUUID()
  periodId?: string;
}
