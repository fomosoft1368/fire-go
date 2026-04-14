import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (err || !user) {
      console.error(
        '[JwtAuthGuard] Auth FAILED for route:',
        request.route?.path || request.path,
      );
      console.error('[JwtAuthGuard] Error:', err?.message);
      console.error('[JwtAuthGuard] Info:', info);
      console.error('[JwtAuthGuard] Auth header present:', !!authHeader);
    } else {
    }

    return super.handleRequest(err, user, info, context);
  }
}
