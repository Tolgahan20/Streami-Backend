import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
  @ApiProperty({
    description: 'User email address to resend verification',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  email!: string;
}
