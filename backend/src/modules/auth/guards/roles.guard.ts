import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // Check if user has role field
    if (user.role) {
      return requiredRoles.includes(user.role);
    }

    // Check if user has userType field (customer/driver/admin)
    if (user.userType) {
      return requiredRoles.includes(user.userType);
    }

    // Check if user is admin by email domain or specific flag
    if (user.email && user.email.includes('@firego.')) {
      return requiredRoles.includes('admin');
    }

    return false;
  }
}
