import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const MAX_SUBJECT_CONCEPTS = 20;

export class SubjectConceptDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  minScore: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  maxScore: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  conceptText: string;
}

// Lista completa de rangos del periodo: reemplaza la actual (vacía los borra).
export default class SetSubjectConceptsDto {
  @IsArray()
  @ArrayMaxSize(MAX_SUBJECT_CONCEPTS)
  @ValidateNested({ each: true })
  @Type(() => SubjectConceptDto)
  concepts: SubjectConceptDto[];
}
