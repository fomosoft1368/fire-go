import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PaymentService } from './payment.service'
import { PaymentMethodService } from './payment-method.service'
import { PaymentController } from './payment.controller'
import { PaymentMethodController } from './payment-method.controller'
import { PaymentSchema } from './schemas/payment.schema'
import { PaymentMethodSchema } from './schemas/payment-method.schema'
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Payment', schema: PaymentSchema },
      { name: 'PaymentMethod', schema: PaymentMethodSchema },
      { name: Driver.name, schema: DriverSchema },
    ]),
  ],
  controllers: [PaymentController, PaymentMethodController],
  providers: [PaymentService, PaymentMethodService],
  exports: [PaymentService, PaymentMethodService],
})
export class PaymentModule {}
