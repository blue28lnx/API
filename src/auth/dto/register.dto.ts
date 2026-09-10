import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'santi@test.com', description: 'Email único del usuario' })
  @IsEmail({}, { message: 'email debe tener formato válido' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'Santi1234',
    description: 'Mínimo 8 caracteres, al menos una letra y un número',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'password debe tener al menos 8 caracteres' })
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password debe incluir al menos una letra y un número',
  })
  password!: string;
}
