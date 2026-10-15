import {
  IsISO8601,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { DATE_ONLY_PATTERN } from '@common/constants/date.constant';
import { INVALID_DATE_MESSAGE } from '../constants/academic-year-messages.constant';
import SetAcademicPeriodsDto from './set-academic-periods.dto';

export default class CreateAcademicYearDto extends SetAcademicPeriodsDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @IsISO8601({ strict: true }, { message: INVALID_DATE_MESSAGE })
  @Matches(DATE_ONLY_PATTERN, { message: INVALID_DATE_MESSAGE })
  startDate: string;

  @IsISO8601({ strict: true }, { message: INVALID_DATE_MESSAGE })
  @Matches(DATE_ONLY_PATTERN, { message: INVALID_DATE_MESSAGE })
  endDate: string;
}
