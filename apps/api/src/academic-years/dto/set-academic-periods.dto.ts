import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import AcademicPeriodDto from './academic-period.dto';

export const MAX_PERIODS = 6;

// Lista completa y en orden: el índice define order_index. Los porcentajes
// deben sumar 100 (se valida en el servicio).
export default class SetAcademicPeriodsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PERIODS)
  @ValidateNested({ each: true })
  @Type(() => AcademicPeriodDto)
  periods: AcademicPeriodDto[];
}
