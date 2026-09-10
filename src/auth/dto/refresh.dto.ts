import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token recibido en login/register' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
