import { IsEnum, IsOptional } from 'class-validator';
import PaginationDto from '@common/dto/pagination.dto';
import StudentStatusEnum from '@common/enums/student-status.enum';

// search busca por nombres, apellidos, documento o código.
export default class ListStudentsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(StudentStatusEnum)
  status?: StudentStatusEnum;
}
