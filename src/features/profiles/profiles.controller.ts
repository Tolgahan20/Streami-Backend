import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfilesService } from './profiles.service';
import { UploadService } from '../../shared/upload/upload.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSocialLinksDto } from './dto/update-social-links.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { SocialLinkResponseDto } from './dto/social-link-response.dto';
import { SocialPlatform } from './entities/social-link.entity';

@ApiTags('Profiles')
@Controller('profiles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get user profile',
    description:
      "Retrieve the current user's profile information including social links",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  async getProfile(@Request() req: any): Promise<ProfileResponseDto> {
    return this.profilesService.getProfileResponseByUserId(req.user.sub);
  }

  @Put()
  @ApiOperation({
    summary: 'Update user profile',
    description:
      "Update the current user's profile information (display name, bio, location, website)",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  @ApiBody({ type: UpdateProfileDto })
  async updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profilesService.updateProfileResponse(
      req.user.sub,
      updateProfileDto,
    );
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        console.log('File filter called with:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        });

        const allowedTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/gif',
        ];

        if (allowedTypes.includes(file.mimetype)) {
          console.log('File type accepted');
          cb(null, true);
        } else {
          console.log('File type rejected:', file.mimetype);
          cb(new BadRequestException('Only image files are allowed'), false);
        }
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload avatar',
    description: "Upload and update the user's avatar image",
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file type or size',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (max 5MB)',
        },
      },
      required: ['avatar'],
    },
  })
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProfileResponseDto> {
    try {
      console.log('Avatar upload request received:', {
        userId: req.user?.sub,
        user: req.user,
        headers: req.headers,
        cookies: req.cookies,
        file: file
          ? {
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
            }
          : 'No file received',
      });

      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const uploadResult = await this.uploadService.uploadAvatar(
        file,
        req.user.sub,
      );

      console.log('Upload result:', uploadResult);

      return this.profilesService.updateAvatarResponse(
        req.user.sub,
        uploadResult.url,
      );
    } catch (error) {
      console.error('Avatar upload error:', error);
      throw error;
    }
  }

  @Delete('avatar')
  @ApiOperation({
    summary: 'Remove avatar',
    description: "Remove the user's avatar image",
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar removed successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  async removeAvatar(@Request() req: any): Promise<ProfileResponseDto> {
    return this.profilesService.removeAvatarResponse(req.user.sub);
  }

  @Get('social-links')
  @ApiOperation({
    summary: 'Get social links',
    description: 'Retrieve all social media links for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Social links retrieved successfully',
    type: [SocialLinkResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  async getSocialLinks(@Request() req: any): Promise<SocialLinkResponseDto[]> {
    return this.profilesService.getSocialLinks(req.user.sub);
  }

  @Put('social-links')
  @ApiOperation({
    summary: 'Update social links',
    description: 'Replace all social media links for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Social links updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  @ApiBody({ type: UpdateSocialLinksDto })
  async updateSocialLinks(
    @Request() req: any,
    @Body() updateSocialLinksDto: UpdateSocialLinksDto,
  ): Promise<ProfileResponseDto> {
    return this.profilesService.updateSocialLinksResponse(
      req.user.sub,
      updateSocialLinksDto,
    );
  }

  @Post('social-links')
  @ApiOperation({
    summary: 'Add social link',
    description: 'Add a single social media link for the current user',
  })
  @ApiResponse({
    status: 201,
    description: 'Social link added successfully',
    type: SocialLinkResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or platform already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
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
          description: 'Social media platform',
          example: 'youtube',
        },
        url: {
          type: 'string',
          description: 'Social media profile URL',
          example: 'https://youtube.com/@johndoe',
        },
      },
      required: ['platform', 'url'],
    },
  })
  async addSocialLink(
    @Request() req: any,
    @Body('platform') platform: SocialPlatform,
    @Body('url') url: string,
  ): Promise<SocialLinkResponseDto> {
    return this.profilesService.addSocialLink(req.user.sub, platform, url);
  }

  @Delete('social-links/:id')
  @ApiOperation({
    summary: 'Remove social link',
    description: 'Remove a specific social media link by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Social link removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Social link not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  @ApiParam({
    name: 'id',
    description: 'Social link ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async removeSocialLink(
    @Request() req: any,
    @Param('id') socialLinkId: string,
  ): Promise<{ message: string }> {
    await this.profilesService.removeSocialLink(req.user.sub, socialLinkId);
    return { message: 'Social link removed successfully' };
  }

  @Post('avatar/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test avatar upload with URL',
    description: 'Test endpoint to update avatar with a URL (for debugging)',
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar updated successfully',
    type: ProfileResponseDto,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatarUrl: {
          type: 'string',
          description: 'URL of the avatar image',
          example: 'https://example.com/avatar.jpg',
        },
      },
      required: ['avatarUrl'],
    },
  })
  async testAvatarUpload(
    @Request() req: any,
    @Body('avatarUrl') avatarUrl: string,
  ): Promise<ProfileResponseDto> {
    console.log('Test avatar upload called with URL:', avatarUrl);
    return this.profilesService.updateAvatarResponse(req.user.sub, avatarUrl);
  }

  @Get('auth-test')
  @ApiOperation({
    summary: 'Test authentication',
    description: 'Test endpoint to check if JWT authentication is working',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication test successful',
  })
  async testAuth(@Request() req: any): Promise<{ message: string; user: any }> {
    console.log('Auth test endpoint called:', {
      user: req.user,
      userId: req.user?.sub,
      headers: req.headers,
      cookies: req.cookies,
    });

    return {
      message: 'Authentication working',
      user: req.user,
    };
  }
}
