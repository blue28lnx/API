import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePracticeSessionDto {
  @ApiProperty({ example: 0.92, minimum: 0, maximum: 1, description: 'Precisión 0.0 a 1.0' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  accuracy!: number;

  @ApiProperty({ example: 12500, description: 'Tiempo total en milisegundos' })
  @IsInt()
  @Min(0)
  @Max(1000 * 60 * 60 * 4)
  timeSpentMs!: number;

  @ApiProperty({ example: 2, description: 'Cantidad de errores' })
  @IsInt()
  @Min(0)
  @Max(10_000)
  mistakes!: number;

  @ApiPropertyOptional({ example: '8e3f19ef-1199-4d9d-a527-77566d22df64' })
  @IsOptional()
  @IsUUID()
  shortcutId?: string;

  @ApiPropertyOptional({ example: 'Primera vez con este combo' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  notes?: string;
}
