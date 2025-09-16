import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailerModule } from '../../shared/mailer/mailer.module';
import { FirebaseModule } from '../../shared/firebase/firebase.module';
import { UsersService } from '../users/users.service';
import { TokensService } from '../tokens/tokens.service';
import { User } from '../users/entities/user.entity';
import { EmailVerificationToken } from '../tokens/entities/email-verification-token.entity';
import { RefreshToken } from '../tokens/entities/refresh-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAccessStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, EmailVerificationToken, RefreshToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    MailerModule,
    FirebaseModule,
  ],
  controllers: [AuthController],
  providers: [UsersService, TokensService, AuthService, JwtAccessStrategy],
  exports: [AuthService],
})
export class AuthFeatureModule {}
