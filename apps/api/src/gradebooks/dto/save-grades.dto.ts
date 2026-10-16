import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class GradeEntryDto {
  @IsUUID()
  evaluationItemId: string;

  // null borra la nota. El rango lo valida la escala de la organización.
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  score: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string | null;
}

export class StudentGradesDto {
  @IsUUID()
  enrollmentId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GradeEntryDto)
  grades?: GradeEntryDto[];

  // Sin el campo se conserva; null o "" la borra.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  teacherObservation?: string | null;
}

// Solo las filas que cambiaron.
export default class SaveGradesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => StudentGradesDto)
  students: StudentGradesDto[];
}
