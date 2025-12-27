import { IsString, IsEmail, IsPhoneNumber, IsEnum, IsArray, IsOptional, MinLength, IsBoolean } from 'class-validator';
import { UserStatus, UserPermission, UserRole } from '../../auth/schemas/user.schema';

export class CreateUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsPhoneNumber('VN')
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsArray()
  permissions?: string[];

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber('VN')
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @IsString()
  blockedReason?: string;
}

export class UpdateUserPermissionsDto {
  @IsArray()
  permissions: string[];
}

export class UserResponseDto {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  permissions?: string[];
  isBlocked?: boolean;
  createdAt?: Date;
  lastActivityAt?: Date;
}
