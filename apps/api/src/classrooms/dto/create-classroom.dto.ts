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

export const MAX_CAPACITY = 200;

export default class CreateClassroomDto {
  @IsUUID()
  academicYearId: string;

  @IsUUID()
  gradeLevelId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  name: string;

  @IsOptional()
  @IsUUID()
  homeroomTeacherId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CAPACITY)
  capacity?: number;
}
