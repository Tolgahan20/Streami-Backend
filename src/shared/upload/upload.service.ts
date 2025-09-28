import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload avatar image to Cloudinary
   */
  async uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadResult> {
    this.logger.log(`Uploading avatar for user: ${userId}`, {
      filename: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
    });

    if (!file) {
      this.logger.error('No file provided to uploadAvatar');
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    if (!this.isValidImageType(file.mimetype)) {
      this.logger.warn(`Invalid file type: ${file.mimetype}`);
      throw new BadRequestException('Only image files are allowed');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      this.logger.warn(`File too large: ${file.size} bytes`);
      throw new BadRequestException('File size must be less than 5MB');
    }

    try {
      // Upload to Cloudinary
      const timestamp = Date.now();
      const publicId = `streami/avatars/avatar_${userId}_${timestamp}`;

      const result = await cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        {
          public_id: publicId,
          folder: 'streami/avatars',
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto' },
            { format: 'auto' },
          ],
        },
      );

      this.logger.log(`Avatar uploaded to Cloudinary: ${result.secure_url}`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      };
    } catch (error) {
      this.logger.error('Cloudinary upload failed:', error);
      throw new BadRequestException('Failed to upload avatar');
    }
  }

  /**
   * Delete avatar image from Cloudinary
   */
  async deleteAvatar(publicId: string): Promise<void> {
    this.logger.log(`Deleting avatar with publicId: ${publicId}`);

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Avatar deleted from Cloudinary: ${result.result}`);
    } catch (error) {
      this.logger.error('Failed to delete avatar from Cloudinary:', error);
      throw new BadRequestException('Failed to delete avatar');
    }
  }

  /**
   * Validate image file type
   */
  private isValidImageType(mimetype: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    return allowedTypes.includes(mimetype);
  }

  /**
   * Generate placeholder URL for development
   */
  private generatePlaceholderUrl(userId: string, filename: string): string {
    const baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    const timestamp = Date.now();
    const extension = filename.split('.').pop() || 'jpg';

    return `${baseUrl}/uploads/avatars/${userId}_${timestamp}.${extension}`;
  }

  /**
   * Get upload configuration for multer
   */
  getMulterConfig() {
    return {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
        if (this.isValidImageType(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only image files are allowed'), false);
        }
      },
    };
  }
}
