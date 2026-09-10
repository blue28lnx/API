import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * PATCH: todos los campos son opcionales; al menos uno debe venir.
 * El service valida el "al menos uno" porque @ValidateIf no es trivial
 * con varias keys.
 */
export class UpdateShortcutDto {
  @ApiPropertyOptional({ example: 'Open terminal' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  action?: string;

  @ApiPropertyOptional({ example: 'IntelliJ' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  tool?: string;

  @ApiPropertyOptional({ example: ['Ctrl', 'Shift', 'P'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  expectedCombo?: string[];

  @ApiPropertyOptional({ example: 'navigation' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;
}
