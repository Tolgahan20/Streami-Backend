import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { Profile } from './entities/profile.entity';
import { SocialLink } from './entities/social-link.entity';
import { UploadModule } from '../../shared/upload/upload.module';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile, SocialLink, User]),
    UploadModule,
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService, UsersService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
