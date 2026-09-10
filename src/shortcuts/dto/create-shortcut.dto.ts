import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShortcutDto {
  @ApiProperty({ example: 'Toggle terminal' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  action!: string;

  @ApiProperty({ example: 'VS Code' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  tool!: string;

  @ApiProperty({
    example: ['Ctrl', '`'],
    description: 'Teclas del combo en orden (Ctrl, Shift, P)',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  expectedCombo!: string[];

  @ApiPropertyOptional({ example: 'navigation' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;
}
