import { Transform } from 'class-transformer';
import { IsUUID, Matches } from 'class-validator';
import {
  DOCUMENT_NUMBER_PATTERN,
  INVALID_DOCUMENT_NUMBER_MESSAGE,
} from '@common/constants/contact-validation.constant';

export default class LookupReportCardDto {
  @IsUUID()
  academicYearId: string;

  // El acudiente puede escribir "1.001.234 567": se quitan puntos, comas y
  // espacios antes de buscar.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[\s.,]/g, '') : value,
  )
  @Matches(DOCUMENT_NUMBER_PATTERN, {
    message: INVALID_DOCUMENT_NUMBER_MESSAGE,
  })
  documentNumber: string;
}
