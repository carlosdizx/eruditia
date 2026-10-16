import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const MAX_EVALUATION_ITEMS = 20;

export class EvaluationItemDto {
  // Sin id se crea; con id se edita una actividad existente.
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  weightPercentage: number;
}

// Lista completa de actividades del periodo, en orden: reemplaza la actual.
export default class SetEvaluationItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_EVALUATION_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => EvaluationItemDto)
  items: EvaluationItemDto[];
}
