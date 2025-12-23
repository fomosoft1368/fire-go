import { IsEmail, IsString, MinLength, IsPhoneNumber, IsEnum } from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(6)
  confirmPassword: string;

  @IsPhoneNumber('VN')
  phone: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEnum(UserRole)
  role: UserRole;
}
