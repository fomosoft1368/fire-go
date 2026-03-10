import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TermsOfServiceDocument = TermsOfService & Document;

@Schema({ timestamps: true })
export class TermsOfService {
  @Prop({ required: true, default: 'vi' })
  language: string; // 'vi', 'en'

  @Prop({ required: true, default: 'driver' })
  userType: string; // 'driver', 'customer'

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, type: Object })
  content: {
    introduction: string;
    sections: Array<{
      title: string;
      content: string;
      subsections?: Array<{
        title: string;
        content: string;
        bulletPoints?: string[];
      }>;
      bulletPoints?: string[];
    }>;
    contactInfo?: {
      email: string;
      phone: string;
      address: string;
    };
  };

  @Prop({ required: true })
  version: string; // e.g., "1.0.0"

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  effectiveDate: Date;

  @Prop()
  lastModifiedBy?: string; // Admin user ID

  @Prop()
  lastModifiedAt?: Date;
}

export const TermsOfServiceSchema = SchemaFactory.createForClass(TermsOfService);

// Indexes
TermsOfServiceSchema.index({ language: 1, userType: 1, isActive: 1 });
TermsOfServiceSchema.index({ version: 1 });
