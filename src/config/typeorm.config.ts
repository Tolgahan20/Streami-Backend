import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../features/users/entities/user.entity';
import { EmailVerificationToken } from '../features/tokens/entities/email-verification-token.entity';
import { RefreshToken } from '../features/tokens/entities/refresh-token.entity';
import { Profile } from '../features/profiles/entities/profile.entity';
import { SocialLink } from '../features/profiles/entities/social-link.entity';

export const buildTypeOrmOptions = (): TypeOrmModuleOptions &
  DataSourceOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, EmailVerificationToken, RefreshToken, Profile, SocialLink],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.TYPEORM_LOGGING === 'true',
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

export const AppDataSource = new DataSource(buildTypeOrmOptions());
