import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsIn,
  IsDate,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import DataRangeEnum from '@common/enums/data-range.enum';

export default class PaginationDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize: number = 10;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  orderBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  orderDirection?: 'ASC' | 'DESC' | 'asc' | 'desc';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  rangeProperty?: string;

  @IsOptional()
  @IsEnum(DataRangeEnum)
  range?: DataRangeEnum;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFirst?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateEnd?: Date;
}
