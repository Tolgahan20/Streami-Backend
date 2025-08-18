import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class TokensCleanupJob {
  private readonly logger = new Logger(TokensCleanupJob.name);

  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly emailTokenRepo: Repository<EmailVerificationToken>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cleanup() {
    const now = new Date();
    const res1 = await this.emailTokenRepo.delete({ expiresAt: LessThan(now) });
    const res2 = await this.refreshTokenRepo.delete({
      expiresAt: LessThan(now),
    });
    this.logger.log(
      `Expired tokens deleted: email=${res1.affected ?? 0} refresh=${res2.affected ?? 0}`,
    );
  }
}
