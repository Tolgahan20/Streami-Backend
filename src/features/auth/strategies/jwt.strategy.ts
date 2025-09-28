import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: (req: Request) => {
        // Prefer access token from httpOnly cookie
        const cookieToken = req?.cookies?.at;
        const authHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

        console.log('JWT extraction:', {
          hasCookieToken: !!cookieToken,
          cookieToken: cookieToken ? 'present' : 'missing',
          hasAuthHeader: !!authHeader,
          authHeader: authHeader ? 'present' : 'missing',
          cookies: req?.cookies,
        });

        if (cookieToken && typeof cookieToken === 'string') return cookieToken;
        return authHeader;
      },
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: any) {
    console.log('JWT Strategy validate called with payload:', payload);
    return payload;
  }
}
