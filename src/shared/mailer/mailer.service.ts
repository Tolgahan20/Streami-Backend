import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly resend = new Resend(
    process.env.RESEND_API_KEY || process.env.MAIL_PROVIDER_API_KEY || '',
  );

  async sendVerificationEmail(params: {
    to: string;
    token: string;
  }): Promise<void> {
    const webUrl = process.env.WEB_URL ?? '';
    const verifyLink = `${webUrl}/verify?token=${encodeURIComponent(params.token)}`;
    const from = process.env.MAIL_FROM ?? 'no-reply@example.com';

    this.logger.log(
      `Attempting to send email to ${params.to} with link: ${verifyLink}`,
    );
    this.logger.log(`Using from: ${from}`);
    this.logger.log(`Resend API key present: ${!!process.env.RESEND_API_KEY}`);

    try {
      if (!process.env.RESEND_API_KEY && !process.env.MAIL_PROVIDER_API_KEY) {
        this.logger.log(`DEV EMAIL to=${params.to} link=${verifyLink}`);
        return;
      }

      const result = await this.resend.emails.send({
        from,
        to: params.to,
        subject: 'Verify your email',
        html: `<p>Verify your email: <a href="${verifyLink}">${verifyLink}</a></p>`,
        text: `Verify your email: ${verifyLink}`,
      });

      this.logger.log(`Email sent successfully: ${JSON.stringify(result)}`);
    } catch (e) {
      this.logger.error('Failed to send verification email', e as Error);
      this.logger.error('Error details:', e);
      // Re-throw to see the error in the logs
      throw e;
    }
  }
}
