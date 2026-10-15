import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';

// Promovido, reprobado y graduado los asigna el asistente de promoción.
export const EDITABLE_STATUSES = [
  EnrollmentStatusEnum.IN_PROGRESS,
  EnrollmentStatusEnum.WITHDRAWN,
  EnrollmentStatusEnum.TRANSFERRED,
] as const;

export default class UpdateEnrollmentDto {
  // Cambio de salón dentro del mismo año.
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @IsOptional()
  @IsIn(EDITABLE_STATUSES)
  status?: (typeof EDITABLE_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  promotionNotes?: string | null;
}
