import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialLinkResponseDto } from './social-link-response.dto';

export class ProfileResponseDto {
  @ApiProperty({
    description: 'Profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId!: string;

  @ApiProperty({
    description: 'Username',
    example: 'johndoe',
  })
  username!: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Bio/description for the user profile',
    example: 'Content creator and streamer passionate about gaming',
  })
  bio?: string;

  @ApiPropertyOptional({
    description: 'User location',
    example: 'London, UK',
  })
  location?: string;

  @ApiPropertyOptional({
    description: 'User website URL',
    example: 'https://johndoe.com',
  })
  website?: string;

  @ApiPropertyOptional({
    description: 'Avatar image URL',
    example:
      'https://res.cloudinary.com/streami/image/upload/v1234567890/avatars/user123.jpg',
  })
  avatarUrl?: string;

  @ApiProperty({
    description: 'Profile creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Profile last update date',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'User social media links',
    type: [SocialLinkResponseDto],
  })
  socialLinks?: SocialLinkResponseDto[];
}
