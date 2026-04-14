import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import {
  TeamStructure,
  TeamStructureSchema,
} from './schemas/team-structure.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import {
  Transaction,
  TransactionSchema,
} from '../wallets/schemas/transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeamStructure.name, schema: TeamStructureSchema },
      { name: User.name, schema: UserSchema },
      { name: Driver.name, schema: DriverSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
