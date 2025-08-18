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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
    private readonly jwtService: JwtService,
    private readonly mailer: MailerService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    displayName?: string;
  }) {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      throw new BadRequestException('email_in_use');
    }
    const passwordHash = await argon2.hash(input.password);
    const user = await this.usersService.create({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
    });

    const rawToken = generateRandomToken(32);
    const tokenHash = sha256Hex(rawToken + process.env.REFRESH_TOKEN_PEPPER);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await this.tokensService.createEmailVerificationToken({
      userId: user.id,
      tokenHash,
      sentToEmail: user.email,
      expiresAt,
    });
    // Send email (or log in dev)
    await this.mailer.sendVerificationEmail({ to: user.email, token: rawToken });
    return { verificationToken: rawToken };
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
    await this.mailer.sendVerificationEmail({ to: user.email, token: rawToken });
    return { ok: true };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('invalid_credentials');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('invalid_credentials');
    if (!user.isEmailVerified)
      throw new UnauthorizedException('email_not_verified');
    return user;
  }

  async login(params: {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const user = await this.validateUser(params.email, params.password);
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
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
    return { accessToken, refreshToken: rawRefresh, user };
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
    const accessToken = await this.jwtService.signAsync(
      { sub: userId },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );
    return { accessToken, refreshToken: newRaw };
  }

  async logout(rawRefresh: string) {
    const hash = sha256Hex(rawRefresh + process.env.REFRESH_TOKEN_PEPPER);
    await this.tokensService.revokeRefreshToken(hash);
  }
}
