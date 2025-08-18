import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { MeResponse } from './dto/me.dto';

const REFRESH_COOKIE = 'rt';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 1000 * 60 * 60 * 24 * 30,
};
const ACCESS_COOKIE = 'at';
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 1000 * 60 * 15,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    await this.authService.register({
      email: dto.email.toLowerCase(),
      password: dto.password,
      displayName: dto.displayName,
    });
    return { message: 'verification_email_sent' };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: 'email_verified' };
  }

  @Post('resend-verification')
  async resend(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto.email.toLowerCase());
    return { message: 'verification_email_sent' };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login({
      email: dto.email.toLowerCase(),
      password: dto.password,
      userAgent: req.headers['user-agent'] || undefined,
      ipAddress:
        (req.headers['x-forwarded-for'] as string) ||
        req.socket.remoteAddress ||
        undefined,
    });
    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie(ACCESS_COOKIE, accessToken, ACCESS_COOKIE_OPTIONS);
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = (req.cookies && req.cookies[REFRESH_COOKIE]) || '';
    const { accessToken, refreshToken } = await this.authService.refresh(raw, {
      userAgent: req.headers['user-agent'] || undefined,
      ipAddress:
        (req.headers['x-forwarded-for'] as string) ||
        req.socket.remoteAddress ||
        undefined,
    });
    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie(ACCESS_COOKIE, accessToken, ACCESS_COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies && req.cookies[REFRESH_COOKIE]) || '';
    if (raw) {
      await this.authService.logout(raw);
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    return { message: 'logged_out' };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Req() req: any): Promise<MeResponse> {
    const user = req.user;
    return { id: user.sub, email: user.email, role: user.role };
  }
}
