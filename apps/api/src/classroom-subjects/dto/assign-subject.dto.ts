import { IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const MAX_WEEKLY_HOURS = 40;
export const MIN_WEIGHT_IN_GPA = 0.1;
export const MAX_WEIGHT_IN_GPA = 10;

export default class AssignSubjectDto {
  @IsUUID()
  subjectId: string;

  // Se puede asignar la materia y elegir el docente después.
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_WEEKLY_HOURS)
  weeklyHours?: number;

  // Peso en el promedio general; 1 por defecto.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_WEIGHT_IN_GPA)
  @Max(MAX_WEIGHT_IN_GPA)
  weightInGpa?: number;
}
