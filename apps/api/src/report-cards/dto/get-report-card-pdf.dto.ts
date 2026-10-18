import { IsOptional, IsUUID } from 'class-validator';
import GetReportCardDto from './get-report-card.dto';

export default class GetReportCardPdfDto extends GetReportCardDto {
  // Boletín de ese periodo; sin periodo, el informe final del año.
  @IsOptional()
  @IsUUID()
  periodId?: string;
}
