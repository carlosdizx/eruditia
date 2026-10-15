import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { INVALID_SUBJECT_CODE_MESSAGE } from '../constants/subject-messages.constant';

export const SUBJECT_CODE_PATTERN = /^[A-Za-z0-9-]{1,20}$/;

// El código se guarda en mayúsculas ("mat" -> "MAT").
export const toUpperCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export default class CreateSubjectDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @Transform(toUpperCode)
  @Matches(SUBJECT_CODE_PATTERN, { message: INVALID_SUBJECT_CODE_MESSAGE })
  code: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  areaName?: string;
}
