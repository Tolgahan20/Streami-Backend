import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { SocialLink, SocialPlatform } from './entities/social-link.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSocialLinksDto } from './dto/update-social-links.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(SocialLink)
    private readonly socialLinkRepository: Repository<SocialLink>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get or create a profile for a user
   */
  async getOrCreateProfile(userId: string): Promise<Profile> {
    this.logger.log(`Getting or creating profile for user: ${userId}`);

    let profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['socialLinks', 'user'],
    });

    if (!profile) {
      this.logger.log(`Creating new profile for user: ${userId}`);
      profile = this.profileRepository.create({ userId });
      profile = await this.profileRepository.save(profile);
      this.logger.log(`Created profile with ID: ${profile.id}`);

      // Fetch the profile with relations
      profile = await this.profileRepository.findOne({
        where: { userId },
        relations: ['socialLinks', 'user'],
      });
    }

    return profile!;
  }

  /**
   * Get profile by user ID
   */
  async getProfileByUserId(userId: string): Promise<Profile> {
    this.logger.log(`Getting profile for user: ${userId}`);

    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['socialLinks', 'user'],
    });

    if (!profile) {
      this.logger.warn(`Profile not found for user: ${userId}`);
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  /**
   * Update profile information
   */
  async updateProfile(
    userId: string,
    updateData: UpdateProfileDto,
  ): Promise<Profile> {
    this.logger.log(`Updating profile for user: ${userId}`, updateData);

    const profile = await this.getOrCreateProfile(userId);
    this.logger.log(`Current profile avatarUrl: ${profile.avatarUrl}`);

    // Separate user fields from profile fields
    const { firstName, lastName, ...profileFields } = updateData;

    // Update user fields if provided
    if (firstName !== undefined || lastName !== undefined) {
      this.logger.log(
        `Updating user firstName: ${firstName}, lastName: ${lastName}`,
      );
      await this.usersService.updateUser(userId, {
        firstName,
        lastName,
      });
    }

    // Update profile fields
    Object.assign(profile, profileFields);
    this.logger.log(`After update profile avatarUrl: ${profile.avatarUrl}`);

    await this.profileRepository.save(profile);
    this.logger.log(`Updated profile for user: ${userId}`);

    return this.getProfileByUserId(userId);
  }

  /**
   * Update avatar URL
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<Profile> {
    this.logger.log(`Updating avatar for user: ${userId}`, { avatarUrl });

    // Use a direct update query instead of loading and saving
    try {
      const result = await this.profileRepository.update(
        { userId },
        { avatarUrl },
      );

      this.logger.log(`Update result: ${JSON.stringify(result)}`);

      if (result.affected === 0) {
        this.logger.warn(`No profile found for user: ${userId}, creating one`);
        // Create profile if it doesn't exist
        const newProfile = this.profileRepository.create({ userId, avatarUrl });
        await this.profileRepository.save(newProfile);
        this.logger.log(`Created new profile with avatarUrl: ${avatarUrl}`);
      } else {
        this.logger.log(`Successfully updated avatar for user: ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update avatar: ${error.message}`, error);
      throw error;
    }

    const retrievedProfile = await this.getProfileByUserId(userId);
    this.logger.log(
      `Retrieved profile avatarUrl: ${retrievedProfile.avatarUrl}`,
    );

    return retrievedProfile;
  }

  /**
   * Remove avatar
   */
  async removeAvatar(userId: string): Promise<Profile> {
    this.logger.log(`Removing avatar for user: ${userId}`);

    const profile = await this.getOrCreateProfile(userId);
    profile.avatarUrl = undefined;

    await this.profileRepository.save(profile);
    this.logger.log(`Removed avatar for user: ${userId}`);

    return this.getProfileByUserId(userId);
  }

  /**
   * Update social links
   */
  async updateSocialLinks(
    userId: string,
    socialLinksData: UpdateSocialLinksDto,
  ): Promise<Profile> {
    this.logger.log(
      `Updating social links for user: ${userId}`,
      socialLinksData,
    );

    const profile = await this.getOrCreateProfile(userId);

    // Remove existing social links
    await this.socialLinkRepository.delete({ profileId: profile.id });

    // Create new social links
    const socialLinks = socialLinksData.socialLinks.map((linkData) =>
      this.socialLinkRepository.create({
        profileId: profile.id,
        platform: linkData.platform,
        url: linkData.url,
      }),
    );

    await this.socialLinkRepository.save(socialLinks);
    this.logger.log(
      `Updated ${socialLinks.length} social links for user: ${userId}`,
    );

    return this.getProfileByUserId(userId);
  }

  /**
   * Get social links for a user
   */
  async getSocialLinks(userId: string): Promise<SocialLink[]> {
    this.logger.log(`Getting social links for user: ${userId}`);

    const profile = await this.getProfileByUserId(userId);
    return profile.socialLinks || [];
  }

  /**
   * Add a single social link
   */
  async addSocialLink(
    userId: string,
    platform: SocialPlatform,
    url: string,
  ): Promise<SocialLink> {
    this.logger.log(`Adding social link for user: ${userId}`, {
      platform,
      url,
    });

    const profile = await this.getOrCreateProfile(userId);

    // Check if platform already exists
    const existingLink = await this.socialLinkRepository.findOne({
      where: { profileId: profile.id, platform },
    });

    if (existingLink) {
      this.logger.warn(
        `Social link for platform ${platform} already exists for user: ${userId}`,
      );
      throw new Error(`Social link for ${platform} already exists`);
    }

    const socialLink = this.socialLinkRepository.create({
      profileId: profile.id,
      platform,
      url,
    });

    const savedLink = await this.socialLinkRepository.save(socialLink);
    this.logger.log(`Added social link with ID: ${savedLink.id}`);

    return savedLink;
  }

  /**
   * Remove a social link
   */
  async removeSocialLink(userId: string, socialLinkId: string): Promise<void> {
    this.logger.log(`Removing social link ${socialLinkId} for user: ${userId}`);

    const profile = await this.getProfileByUserId(userId);

    const result = await this.socialLinkRepository.delete({
      id: socialLinkId,
      profileId: profile.id,
    });

    if (result.affected === 0) {
      this.logger.warn(
        `Social link ${socialLinkId} not found for user: ${userId}`,
      );
      throw new NotFoundException('Social link not found');
    }

    this.logger.log(`Removed social link ${socialLinkId}`);
  }

  /**
   * Transform Profile entity to ProfileResponseDto
   */
  private transformToProfileResponse(profile: Profile): ProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      username: profile.user?.username || '',
      firstName: profile.user?.firstName,
      lastName: profile.user?.lastName,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      avatarUrl: profile.avatarUrl,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      socialLinks: profile.socialLinks?.map((link) => ({
        id: link.id,
        profileId: link.profileId,
        platform: link.platform,
        url: link.url,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      })),
    };
  }

  /**
   * Get profile response by user ID
   */
  async getProfileResponseByUserId(
    userId: string,
  ): Promise<ProfileResponseDto> {
    const profile = await this.getProfileByUserId(userId);
    return this.transformToProfileResponse(profile);
  }

  /**
   * Update profile and return response
   */
  async updateProfileResponse(
    userId: string,
    updateData: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    await this.updateProfile(userId, updateData);
    return this.getProfileResponseByUserId(userId);
  }

  /**
   * Update avatar and return response
   */
  async updateAvatarResponse(
    userId: string,
    avatarUrl: string,
  ): Promise<ProfileResponseDto> {
    this.logger.log(
      `updateAvatarResponse called for user: ${userId} with avatarUrl: ${avatarUrl}`,
    );
    await this.updateAvatar(userId, avatarUrl);
    this.logger.log(`updateAvatarResponse completed for user: ${userId}`);
    return this.getProfileResponseByUserId(userId);
  }

  /**
   * Remove avatar and return response
   */
  async removeAvatarResponse(userId: string): Promise<ProfileResponseDto> {
    await this.removeAvatar(userId);
    return this.getProfileResponseByUserId(userId);
  }

  /**
   * Update social links and return response
   */
  async updateSocialLinksResponse(
    userId: string,
    socialLinksData: UpdateSocialLinksDto,
  ): Promise<ProfileResponseDto> {
    await this.updateSocialLinks(userId, socialLinksData);
    return this.getProfileResponseByUserId(userId);
  }
}
