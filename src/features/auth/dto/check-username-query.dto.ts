import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckUsernameQueryDto {
  @ApiProperty({
    description:
      'Username to check availability (3-30 characters, alphanumeric and underscores only)',
    example: 'john_doe123',
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username!: string;
}
