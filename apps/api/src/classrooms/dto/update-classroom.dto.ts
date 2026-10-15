import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_CAPACITY } from './create-classroom.dto';

// El año no se cambia: un salón de otro año es otro salón. null quita el
// director o el cupo.
export default class UpdateClassroomDto {
  @IsOptional()
  @IsUUID()
  gradeLevelId?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  name?: string;

  @IsOptional()
  @IsUUID()
  homeroomTeacherId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CAPACITY)
  capacity?: number | null;
}
