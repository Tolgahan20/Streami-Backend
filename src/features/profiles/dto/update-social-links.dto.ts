import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ValidateNested,
  IsString,
  IsUrl,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SocialPlatform } from '../entities/social-link.entity';

export class SocialLinkDto {
  @ApiProperty({
    description: 'Social media platform',
    enum: [
      'youtube',
      'twitch',
      'twitter',
      'instagram',
      'tiktok',
      'discord',
      'github',
      'website',
    ],
    example: 'youtube',
  })
  @IsEnum([
    'youtube',
    'twitch',
    'twitter',
    'instagram',
    'tiktok',
    'discord',
    'github',
    'website',
  ])
  platform!: SocialPlatform;

  @ApiProperty({
    description: 'Social media profile URL',
    example: 'https://youtube.com/@johndoe',
  })
  @IsString()
  @IsUrl({ require_tld: true })
  url!: string;
}

export class UpdateSocialLinksDto {
  @ApiProperty({
    description: 'Array of social media links',
    type: [SocialLinkDto],
    example: [
      { platform: 'youtube', url: 'https://youtube.com/@johndoe' },
      { platform: 'twitch', url: 'https://twitch.tv/johndoe' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks!: SocialLinkDto[];
}
