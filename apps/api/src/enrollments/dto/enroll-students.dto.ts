import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsISO8601,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { DATE_ONLY_PATTERN } from '@common/constants/date.constant';
import { INVALID_DATE_MESSAGE } from '../../academic-years/constants/academic-year-messages.constant';

export const MAX_STUDENTS_PER_ENROLLMENT = 200;

// Matrícula individual o masiva en un salón.
export default class EnrollStudentsDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_STUDENTS_PER_ENROLLMENT)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  studentIds: string[];

  // Hoy por defecto.
  @IsOptional()
  @IsISO8601({ strict: true }, { message: INVALID_DATE_MESSAGE })
  @Matches(DATE_ONLY_PATTERN, { message: INVALID_DATE_MESSAGE })
  enrollmentDate?: string;
}
