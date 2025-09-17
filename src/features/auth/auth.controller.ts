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
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { CheckUsernameResponseDto } from './dto/check-username.dto';
import { CheckUsernameQueryDto } from './dto/check-username-query.dto';
import { SetUsernameDto } from './dto/set-username.dto';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { MeResponse } from './dto/me.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';

const REFRESH_COOKIE = 'rt';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none' as const,
  path: '/',
  maxAge: 1000 * 60 * 60 * 24 * 30,
};
const ACCESS_COOKIE = 'at';
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none' as const,
  path: '/',
  maxAge: 1000 * 60 * 15,
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('check-username')
  @ApiOperation({ summary: 'Check if username is available' })
  @ApiQuery({
    name: 'username',
    description: 'Username to check availability',
    example: 'john_doe123',
  })
  @ApiResponse({
    status: 200,
    description: 'Username availability check result',
    type: CheckUsernameResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid username format',
  })
  async checkUsername(
    @Query(ValidationPipe) query: CheckUsernameQueryDto,
  ): Promise<CheckUsernameResponseDto> {
    return await this.authService.checkUsernameAvailability(query.username);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully, verification email sent',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'verification_email_sent',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - email already in use or validation failed',
  })
  async register(@Body() dto: RegisterDto) {
    await this.authService.register({
      email: dto.email.toLowerCase(),
      username: dto.username.toLowerCase(),
      password: dto.password,
      displayName: dto.displayName,
    });
    return { message: 'verification_email_sent' };
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify user email with token' })
  @ApiQuery({
    name: 'token',
    description: 'Email verification token',
    example: 'abc123def456...',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'email_verified',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid or expired token',
  })
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: 'email_verified' };
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Verification email resent',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'verification_email_sent',
        },
      },
    },
  })
  async resend(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto.email.toLowerCase());
    return { message: 'verification_email_sent' };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'JWT access token',
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            displayName: { type: 'string' },
            isEmailVerified: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials or email not verified',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login({
      emailOrUsername: dto.emailOrUsername.toLowerCase(),
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
        username: user.username,
        displayName: user.displayName,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Google OAuth' })
  @ApiBody({ type: GoogleAuthDto })
  @ApiResponse({
    status: 200,
    description: 'Google authentication successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'JWT access token',
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            displayName: { type: 'string' },
            isEmailVerified: { type: 'boolean' },
            loginType: { type: 'string', enum: ['EMAIL', 'GOOGLE'] },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid Google token',
  })
  async googleAuth(
    @Body() dto: GoogleAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('🔥 Google auth endpoint called!');
    console.log('🔥 Request body:', dto);
    console.log('🔥 User agent:', req.headers['user-agent']);

    const { accessToken, refreshToken, user } =
      await this.authService.googleAuth({
        idToken: dto.idToken,
        displayName: dto.displayName,
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
        username: user.username,
        displayName: user.displayName,
        isEmailVerified: user.isEmailVerified,
        loginType: user.loginType,
        requiresUsername: !user.username, // Flag to indicate if user needs to set username
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiCookieAuth('rt')
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'New JWT access token',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid refresh token',
  })
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
  @ApiOperation({ summary: 'Logout user and revoke tokens' })
  @ApiCookieAuth('rt')
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'logged_out',
        },
      },
    },
  })
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
  @ApiOperation({ summary: 'Get current user information' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('at')
  @ApiResponse({
    status: 200,
    description: 'Current user information',
    type: MeResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async me(@Req() req: any): Promise<MeResponse> {
    const user = req.user;
    return {
      id: user.sub,
      email: user.email,
      username: user.username,
      role: user.role,
    };
  }

  @Post('set-username')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Set username for social login users' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('at')
  @ApiBody({ type: SetUsernameDto })
  @ApiResponse({
    status: 200,
    description: 'Username set successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'username_set',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - username already taken or invalid format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async setUsername(@Body() dto: SetUsernameDto, @Req() req: any) {
    await this.authService.setUsernameForSocialUser(
      req.user.sub,
      dto.username.toLowerCase(),
    );
    return { message: 'username_set' };
  }
}
