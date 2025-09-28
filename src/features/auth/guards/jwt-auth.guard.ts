import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('JwtAuthGuard canActivate called');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    console.log('JwtAuthGuard handleRequest:', { err, user, info });
    if (err || !user) {
      console.log('JwtAuthGuard: Authentication failed', { err, info });
      throw err || new Error('Authentication failed');
    }
    return user;
  }
}
