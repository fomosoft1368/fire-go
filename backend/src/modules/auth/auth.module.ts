import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema } from './schemas/user.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { jwtConfig } from '../../config/app.config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Driver.name, schema: DriverSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    PassportModule,
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: { expiresIn: jwtConfig.expiresIn as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, JwtStrategy, JwtModule, RolesGuard],
})
export class AuthModule {}
