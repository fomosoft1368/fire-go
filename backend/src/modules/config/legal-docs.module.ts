import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LegalDocsController } from './legal-docs.controller';
import { LegalDocsService } from './legal-docs.service';
import { TermsOfService, TermsOfServiceSchema } from './schemas/terms-of-service.schema';
import { PrivacyPolicy, PrivacyPolicySchema } from './schemas/privacy-policy.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TermsOfService.name, schema: TermsOfServiceSchema },
      { name: PrivacyPolicy.name, schema: PrivacyPolicySchema },
    ]),
    AuthModule,
  ],
  controllers: [LegalDocsController],
  providers: [LegalDocsService],
  exports: [LegalDocsService],
})
export class LegalDocsModule {}
