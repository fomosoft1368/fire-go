import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { jwtConfig } from '../../../config/app.config';
import { User, UserDocument } from '../schemas/user.schema';
import { Driver, DriverDocument } from '../../drivers/schemas/driver.schema';
import {
  Customer,
  CustomerDocument,
} from '../../customers/schemas/customer.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: process.env.NODE_ENV !== 'production',
      secretOrKey: jwtConfig.secret,
    });
  }

  async validate(payload: any) {
    const { sub, role, tv = 0 } = payload;

    // ✅ Kiểm tra tokenVersion — nếu lệch là đã login thiết bị khác
    let currentVersion = 0;

    if (role === 'driver') {
      const driver = (await this.driverModel
        .findById(sub)
        .select('tokenVersion')
        .lean()) as any;
      if (!driver) throw new UnauthorizedException('Tài khoản không tồn tại');
      currentVersion = driver.tokenVersion ?? 0;
    } else if (role === 'customer') {
      const customer = (await this.customerModel
        .findById(sub)
        .select('tokenVersion')
        .lean()) as any;
      if (!customer) throw new UnauthorizedException('Tài khoản không tồn tại');
      currentVersion = customer.tokenVersion ?? 0;
    } else {
      // admin/staff
      const user = (await this.userModel
        .findById(sub)
        .select('tokenVersion')
        .lean()) as any;
      if (!user) throw new UnauthorizedException('Tài khoản không tồn tại');
      currentVersion = user.tokenVersion ?? 0;
    }

    if (tv !== currentVersion) {
      throw new UnauthorizedException(
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      );
    }

    return {
      sub,
      id: sub,
      email: payload.email,
      role,
    };
  }
}
