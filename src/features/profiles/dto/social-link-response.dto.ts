import { ApiProperty } from '@nestjs/swagger';
import { SocialPlatform } from '../entities/social-link.entity';

export class SocialLinkResponseDto {
  @ApiProperty({
    description: 'Social link ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  profileId!: string;

  @ApiProperty({
    description: 'Social media platform',
    enum: ['youtube', 'twitch', 'twitter', 'instagram', 'tiktok', 'discord', 'github', 'website'],
    example: 'youtube',
  })
  platform!: SocialPlatform;

  @ApiProperty({
    description: 'Social media profile URL',
    example: 'https://youtube.com/@johndoe',
  })
  url!: string;

  @ApiProperty({
    description: 'Social link creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Social link last update date',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt!: Date;
}
