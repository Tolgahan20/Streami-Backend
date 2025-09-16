import { ApiProperty } from '@nestjs/swagger';

export class MeResponse {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  email!: string;

  @ApiProperty({
    description: 'Username',
    example: 'john_doe123',
    required: false,
  })
  username?: string;

  @ApiProperty({
    description: 'User role in the system',
    example: 'USER',
    enum: ['USER', 'ADMIN'],
  })
  role!: 'USER' | 'ADMIN';
}
