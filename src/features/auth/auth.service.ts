import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { TokensService } from '../tokens/tokens.service';
import { generateRandomToken, sha256Hex } from '../../shared/utils/crypto.util';
import { MailerService } from '../../shared/mailer/mailer.service';
import { FirebaseService } from '../../shared/firebase/firebase.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
    private readonly jwtService: JwtService,
    private readonly mailer: MailerService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async register(input: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) {
    try {
      this.logger.log(
        `Starting registration for email: ${input.email}, username: ${input.username}`,
      );
      this.logger.log(
        `Environment check - REFRESH_TOKEN_PEPPER: ${process.env.REFRESH_TOKEN_PEPPER ? 'SET' : 'MISSING'}`,
      );

      const existingByEmail = await this.usersService.findByEmail(input.email);
      if (existingByEmail) {
        this.logger.log(`User already exists with email: ${input.email}`);
        throw new BadRequestException('email_in_use');
      }

      const existingByUsername = await this.usersService.findByUsername(
        input.username,
      );
      if (existingByUsername) {
        this.logger.log(`User already exists with username: ${input.username}`);
        throw new BadRequestException('username_in_use');
      }

      this.logger.log(`Hashing password for user: ${input.email}`);
      const passwordHash = await argon2.hash(input.password);

      this.logger.log(`Creating user in database: ${input.email}`);
      const userData = {
        email: input.email,
        username: input.username,
        passwordHash,
        displayName: input.displayName,
        loginType: 'EMAIL' as const,
      };
      this.logger.log(`User data to create:`, userData);

      const user = await this.usersService.create(userData);
      this.logger.log(`User created successfully with ID: ${user.id}`);

      if (!process.env.REFRESH_TOKEN_PEPPER) {
        throw new Error('REFRESH_TOKEN_PEPPER environment variable is not set');
      }

      const rawToken = generateRandomToken(32);
      const tokenHash = sha256Hex(rawToken + process.env.REFRESH_TOKEN_PEPPER);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

      this.logger.log(`Creating email verification token for user: ${user.id}`);
      await this.tokensService.createEmailVerificationToken({
        userId: user.id,
        tokenHash,
        sentToEmail: user.email,
        expiresAt,
      });

      // Send email (or log in dev)
      this.logger.log(`Sending verification email to: ${user.email}`);
      await this.mailer.sendVerificationEmail({
        to: user.email,
        token: rawToken,
      });

      this.logger.log(
        `Registration completed successfully for: ${input.email}`,
      );
      return { verificationToken: rawToken };
    } catch (error) {
      this.logger.error(`Registration failed for ${input.email}:`, error);
      this.logger.error(`Error stack:`, error.stack);
      throw error;
    }
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = sha256Hex(rawToken + process.env.REFRESH_TOKEN_PEPPER);
    const token =
      await this.tokensService.consumeEmailVerificationToken(tokenHash);
    if (!token) throw new BadRequestException('invalid_or_expired_token');
    await this.usersService.markEmailVerified(token.userId);
    return true;
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.isEmailVerified) {
      return { ok: true };
    }
    const rawToken = generateRandomToken(32);
    const tokenHash = sha256Hex(rawToken + process.env.REFRESH_TOKEN_PEPPER);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await this.tokensService.createEmailVerificationToken({
      userId: user.id,
      tokenHash,
      sentToEmail: user.email,
      expiresAt,
    });
    await this.mailer.sendVerificationEmail({
      to: user.email,
      token: rawToken,
    });
    return { ok: true };
  }

  async validateUser(emailOrUsername: string, password: string) {
    const user = await this.usersService.findByEmailOrUsername(emailOrUsername);
    if (!user) throw new UnauthorizedException('invalid_credentials');
    if (user.loginType !== 'EMAIL') {
      throw new UnauthorizedException('use_google_login');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('invalid_credentials');
    }
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('invalid_credentials');
    if (!user.isEmailVerified)
      throw new UnauthorizedException('email_not_verified');
    return user;
  }

  async login(params: {
    emailOrUsername: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const user = await this.validateUser(
      params.emailOrUsername,
      params.password,
    );
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );
    const rawRefresh = generateRandomToken(48);
    const tokenHash = sha256Hex(rawRefresh + process.env.REFRESH_TOKEN_PEPPER);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await this.tokensService.createRefreshToken({
      userId: user.id,
      tokenHash,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      expiresAt,
    });
    await this.usersService.updateLastLogin(user.id);
    return { accessToken, refreshToken: rawRefresh, user };
  }

  async googleAuth(params: {
    idToken: string;
    displayName: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    try {
      this.logger.log(
        `Starting Google authentication for displayName: ${params.displayName}`,
      );
      this.logger.log(`ID token length: ${params.idToken.length}`);

      // Verify the Google ID token
      this.logger.log(`Verifying Google ID token...`);
      const decodedToken = await this.firebaseService.verifyIdToken(
        params.idToken,
      );
      this.logger.log(
        `Google ID token verified successfully for UID: ${decodedToken.uid}`,
      );
      this.logger.log(`Decoded token email: ${decodedToken.email}`);

      // Check if user already exists by Google ID
      this.logger.log(
        `Checking if user exists by Google ID: ${decodedToken.uid}`,
      );
      let user = await this.usersService.findByGoogleId(decodedToken.uid);

      if (!user) {
        this.logger.log(
          `No user found by Google ID, checking by email: ${decodedToken.email}`,
        );
        // Check if user exists by email (in case they previously used email/password)
        user = await this.usersService.findByEmail(decodedToken.email!);

        if (user) {
          this.logger.log(
            `Found existing user by email, updating to Google login`,
          );
          // Update existing user to use Google login
          user.googleId = decodedToken.uid;
          user.loginType = 'GOOGLE';
          user.isEmailVerified = true; // Google accounts are pre-verified
          user.displayName =
            params.displayName || user.displayName || decodedToken.name;
          await this.usersService.updateLastLogin(user.id);
          this.logger.log(
            `Updated existing user ${user.id} to use Google login`,
          );
        } else {
          this.logger.log(`Creating new user with Google credentials`);
          // Create new user
          const userData = {
            email: decodedToken.email!,
            googleId: decodedToken.uid,
            displayName: params.displayName || decodedToken.name,
            loginType: 'GOOGLE' as const,
            isEmailVerified: true, // Google accounts are pre-verified
          };
          this.logger.log(`User data to create:`, userData);

          user = await this.usersService.create(userData);
          this.logger.log(
            `New Google user created successfully with ID: ${user.id}`,
          );
        }
      } else {
        this.logger.log(`Found existing user by Google ID: ${user.id}`);
        // Update last login for existing user
        await this.usersService.updateLastLogin(user.id);
        this.logger.log(`Updated last login for existing user: ${user.id}`);
      }

      // Generate JWT tokens
      this.logger.log(`Generating JWT tokens for user: ${user.id}`);
      const accessToken = await this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
      );

      const rawRefresh = generateRandomToken(48);
      const tokenHash = sha256Hex(
        rawRefresh + process.env.REFRESH_TOKEN_PEPPER,
      );
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

      this.logger.log(`Creating refresh token for user: ${user.id}`);
      await this.tokensService.createRefreshToken({
        userId: user.id,
        tokenHash,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        expiresAt,
      });

      this.logger.log(
        `Google authentication completed successfully for user: ${user.id}`,
      );
      return { accessToken, refreshToken: rawRefresh, user };
    } catch (error) {
      this.logger.error(`Google authentication failed:`, error);
      this.logger.error(`Error stack:`, error.stack);
      throw error;
    }
  }

  async refresh(
    rawRefresh: string,
    ctx: { userAgent?: string; ipAddress?: string },
  ) {
    const oldHash = sha256Hex(rawRefresh + process.env.REFRESH_TOKEN_PEPPER);
    const newRaw = generateRandomToken(48);
    const newHash = sha256Hex(newRaw + process.env.REFRESH_TOKEN_PEPPER);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    const rotated = await this.tokensService.rotateRefreshToken(oldHash, {
      tokenHash: newHash,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
      expiresAt,
    });
    if (!rotated) throw new UnauthorizedException('invalid_refresh');
    const userId = rotated.userId;

    // Get user info to include in JWT
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('invalid_refresh');

    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );
    return { accessToken, refreshToken: newRaw };
  }

  async logout(rawRefresh: string) {
    const hash = sha256Hex(rawRefresh + process.env.REFRESH_TOKEN_PEPPER);
    await this.tokensService.revokeRefreshToken(hash);
  }

  async checkUsernameAvailability(
    username: string,
  ): Promise<{ available: boolean; message: string }> {
    this.logger.log(`Checking username availability: ${username}`);
    const isAvailable = await this.usersService.isUsernameAvailable(username);

    return {
      available: isAvailable,
      message: isAvailable
        ? 'Username is available'
        : 'Username is already taken',
    };
  }

  async setUsernameForSocialUser(
    userId: string,
    username: string,
  ): Promise<void> {
    this.logger.log(
      `Setting username for social user: ${userId} to: ${username}`,
    );

    // Check if username is available
    const isAvailable = await this.usersService.isUsernameAvailable(username);
    if (!isAvailable) {
      throw new BadRequestException('username_in_use');
    }

    // Update the user's username
    await this.usersService.updateUsername(userId, username);
    this.logger.log(`Username set successfully for user: ${userId}`);
  }
}
