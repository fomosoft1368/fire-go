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
  
    
    if (err || !user) {
      console.error('[JwtAuthGuard] Auth FAILED for route:', request.route?.path || request.path);
    } else {
      console.log('[JwtAuthGuard] Auth SUCCESS:', { userId: user.sub, role: user.role });
    }
    return super.handleRequest(err, user, info, context);
  }
}
