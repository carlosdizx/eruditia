import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import GetReportCardDto from './get-report-card.dto';

export default class LookupReportCardDto extends GetReportCardDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  documentNumber: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'El PIN tiene 6 dígitos' })
  accessPin: string;
}
