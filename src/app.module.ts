import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from './config/typeorm.config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './features/users/entities/user.entity';
import { EmailVerificationToken } from './features/tokens/entities/email-verification-token.entity';
import { RefreshToken } from './features/tokens/entities/refresh-token.entity';
import { AuthFeatureModule } from './features/auth/auth.module';
import { ProfilesModule } from './features/profiles/profiles.module';
import { TokensCleanupJob } from './features/tokens/tokens.cleanup';
import { MailerModule } from './shared/mailer/mailer.module';
import { FirebaseModule } from './shared/firebase/firebase.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRoot(buildTypeOrmOptions()),
    TypeOrmModule.forFeature([User, EmailVerificationToken, RefreshToken]),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    JwtModule.register({}),
    MailerModule,
    FirebaseModule,
    AuthFeatureModule,
    ProfilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    TokensCleanupJob,
  ],
})
export class AppModule {}
