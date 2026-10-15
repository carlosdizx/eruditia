import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import { DATE_ONLY_PATTERN } from '@common/constants/date.constant';
import { INVALID_DATE_MESSAGE } from '../constants/academic-year-messages.constant';

// Los periodos se editan con PUT /academic-years/:id/periods.
export default class UpdateAcademicYearDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: INVALID_DATE_MESSAGE })
  @Matches(DATE_ONLY_PATTERN, { message: INVALID_DATE_MESSAGE })
  startDate?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: INVALID_DATE_MESSAGE })
  @Matches(DATE_ONLY_PATTERN, { message: INVALID_DATE_MESSAGE })
  endDate?: string;

  // Cerrar el año también cierra el ingreso de notas de todos sus periodos.
  @IsOptional()
  @IsEnum(AcademicYearStatusEnum)
  status?: AcademicYearStatusEnum;
}
