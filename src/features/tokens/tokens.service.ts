import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly emailTokenRepo: Repository<EmailVerificationToken>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async createEmailVerificationToken(input: {
    userId: string;
    tokenHash: string;
    sentToEmail: string;
    expiresAt: Date;
  }): Promise<EmailVerificationToken> {
    const entity = this.emailTokenRepo.create(input);
    return this.emailTokenRepo.save(entity);
  }

  async consumeEmailVerificationToken(
    tokenHash: string,
  ): Promise<EmailVerificationToken | null> {
    const token = await this.emailTokenRepo.findOne({ where: { tokenHash } });
    if (!token) return null;
    if (token.consumedAt || token.expiresAt < new Date()) return null;
    token.consumedAt = new Date();
    await this.emailTokenRepo.save(token);
    return token;
  }

  async createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    const entity = this.refreshTokenRepo.create(input);
    return this.refreshTokenRepo.save(entity);
  }

  async rotateRefreshToken(
    oldTokenHash: string,
    newInput: {
      tokenHash: string;
      userAgent?: string;
      ipAddress?: string;
      expiresAt: Date;
    },
  ): Promise<RefreshToken | null> {
    const old = await this.refreshTokenRepo.findOne({
      where: { tokenHash: oldTokenHash },
    });
    if (!old || old.revokedAt || old.expiresAt < new Date()) return null;
    old.revokedAt = new Date();
    await this.refreshTokenRepo.save(old);
    const entity = this.refreshTokenRepo.create({
      userId: old.userId,
      tokenHash: newInput.tokenHash,
      userAgent: newInput.userAgent,
      ipAddress: newInput.ipAddress,
      expiresAt: newInput.expiresAt,
    });
    return this.refreshTokenRepo.save(entity);
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    const token = await this.refreshTokenRepo.findOne({ where: { tokenHash } });
    if (!token) return;
    token.revokedAt = new Date();
    await this.refreshTokenRepo.save(token);
  }
}
