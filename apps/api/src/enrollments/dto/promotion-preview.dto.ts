import { IsUUID } from 'class-validator';

export default class PromotionPreviewDto {
  @IsUUID()
  sourceClassroomId: string;

  @IsUUID()
  targetAcademicYearId: string;
}
