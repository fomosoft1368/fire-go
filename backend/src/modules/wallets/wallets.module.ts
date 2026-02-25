import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { PaymentMethod, PaymentMethodSchema } from '../payment/schemas/payment-method.schema';
import { PricingModule } from '../pricing/pricing.module';
import { SepayService } from '../drivers/services/sepay.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: PaymentMethod.name, schema: PaymentMethodSchema },
    ]),
    PricingModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService, SepayService],
  exports: [WalletsService],
})
export class WalletsModule {}
