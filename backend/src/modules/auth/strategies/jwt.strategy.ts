import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConfig } from '../../../config/app.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: process.env.NODE_ENV !== 'production', // Ignore expiration in development
      secretOrKey: jwtConfig.secret,
    });
    console.log('[JwtStrategy] Initialized with secret:', jwtConfig.secret.substring(0, 20) + '...');
  }

  async validate(payload: any) {
    console.log('[JwtStrategy] Validating payload:', payload);
    console.log('[JwtStrategy] Extract sub:', payload.sub);
    console.log('[JwtStrategy] Type of sub:', typeof payload.sub);
    
    return {
      sub: payload.sub,
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
