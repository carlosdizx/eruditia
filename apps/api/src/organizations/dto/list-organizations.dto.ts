import { IsEnum, IsOptional } from 'class-validator';
import PaginationDto from '@common/dto/pagination.dto';
import DeletedFilterEnum from '@common/enums/deleted-filter.enum';

export default class ListOrganizationsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(DeletedFilterEnum)
  deleted: DeletedFilterEnum = DeletedFilterEnum.EXCLUDE;
}
