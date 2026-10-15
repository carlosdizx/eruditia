import { IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  MAX_WEEKLY_HOURS,
  MAX_WEIGHT_IN_GPA,
  MIN_WEIGHT_IN_GPA,
} from './assign-subject.dto';

// La materia no cambia: para otra materia se quita y se asigna. null quita el
// docente o las horas.
export default class UpdateClassroomSubjectDto {
  @IsOptional()
  @IsUUID()
  teacherId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_WEEKLY_HOURS)
  weeklyHours?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_WEIGHT_IN_GPA)
  @Max(MAX_WEIGHT_IN_GPA)
  weightInGpa?: number;
}
