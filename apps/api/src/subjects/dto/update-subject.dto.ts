import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { INVALID_SUBJECT_CODE_MESSAGE } from '../constants/subject-messages.constant';
import { SUBJECT_CODE_PATTERN, toUpperCode } from './create-subject.dto';

// null quita el área.
export default class UpdateSubjectDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(toUpperCode)
  @Matches(SUBJECT_CODE_PATTERN, { message: INVALID_SUBJECT_CODE_MESSAGE })
  code?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  areaName?: string | null;
}
