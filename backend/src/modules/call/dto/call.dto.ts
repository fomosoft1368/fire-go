import { IsEnum, IsMongoId, IsString } from 'class-validator';
import { CallerRole } from '../schemas/call.schema';

export class CreateCallDto {
  @IsMongoId({ message: 'rideId phải là MongoDB ObjectId hợp lệ' })
  rideId: string;

  @IsEnum(CallerRole, { message: 'callerRole phải là customer hoặc driver' })
  callerRole: CallerRole;
}

export class ActionCallDto {
  @IsMongoId({ message: 'callId phải là MongoDB ObjectId hợp lệ' })
  callId: string;
}
