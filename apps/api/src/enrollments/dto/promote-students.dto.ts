import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import PromotionOutcomeEnum from '@common/enums/promotion-outcome.enum';
import { DATE_ONLY_PATTERN } from '@common/constants/date.constant';
import { INVALID_DATE_MESSAGE } from '../../academic-years/constants/academic-year-messages.constant';
import { MAX_STUDENTS_PER_ENROLLMENT } from './enroll-students.dto';

export class PromotionDecisionDto {
  @IsUUID()
  enrollmentId: string;

  @IsEnum(PromotionOutcomeEnum)
  outcome: PromotionOutcomeEnum;

  // Obligatorio al promover o repetir; se ignora al graduar.
  @IsOptional()
  @IsUUID()
  targetClassroomId?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  finalAverage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  promotionNotes?: string;
}

export default class PromoteStudentsDto {
  @IsUUID()
  sourceClassroomId: string;

  @IsUUID()
  targetAcademicYearId: string;

  // Fecha de las nuevas matrículas; por defecto, hoy.
  @IsOptional()
  @IsISO8601({ strict: true }, { message: INVALID_DATE_MESSAGE })
  @Matches(DATE_ONLY_PATTERN, { message: INVALID_DATE_MESSAGE })
  enrollmentDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_STUDENTS_PER_ENROLLMENT)
  @ArrayUnique((decision: PromotionDecisionDto) => decision.enrollmentId)
  @ValidateNested({ each: true })
  @Type(() => PromotionDecisionDto)
  decisions: PromotionDecisionDto[];
}
