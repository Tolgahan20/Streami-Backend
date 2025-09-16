import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckUsernameDto {
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

export class CheckUsernameResponseDto {
  @ApiProperty({
    description: 'Whether the username is available',
    example: true,
  })
  available!: boolean;

  @ApiProperty({
    description: 'Message about username availability',
    example: 'Username is available',
  })
  message!: string;
}
