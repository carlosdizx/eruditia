import { IsOptional, IsUUID } from 'class-validator';
import GetRankingOptionsDto from './get-ranking-options.dto';

export default class GetSubjectLeadersDto extends GetRankingOptionsDto {
  @IsUUID()
  classroomId: string;

  // Sin periodo se usa el acumulado anual.
  @IsOptional()
  @IsUUID()
  periodId?: string;
}
