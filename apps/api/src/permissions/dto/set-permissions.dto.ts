import { ArrayUnique, IsArray, IsEnum } from 'class-validator';
import PermissionEnum from '@common/enums/permission.enum';

export default class SetPermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsEnum(PermissionEnum, { each: true })
  permissions: PermissionEnum[];
}
