import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    console.log('[JwtAuthGuard] Authorization header:', authHeader ? `${authHeader.substring(0, 50)}...` : 'missing');
    console.log('[JwtAuthGuard] Route:', request.route?.path || request.path);
    console.log('[JwtAuthGuard] Method:', request.method);
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    console.log('[JwtAuthGuard] handleRequest called:');
    console.log('  - err:', err?.message || err);
    console.log('  - user:', user);
    console.log('  - info:', info?.message || info);
    console.log('  - route:', request.route?.path || request.path);
    
    if (err || !user) {
      console.error('[JwtAuthGuard] Auth FAILED for route:', request.route?.path || request.path);
    } else {
      console.log('[JwtAuthGuard] Auth SUCCESS:', { userId: user.sub, role: user.role });
    }
    return super.handleRequest(err, user, info, context);
  }
}
