import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address or username',
    example: 'user@example.com or john_doe123',
  })
  @IsString()
  emailOrUsername!: string;

  @ApiProperty({
    description: 'User password',
    example: 'P@ssw0rd!',
  })
  @IsString()
  password!: string;
}
