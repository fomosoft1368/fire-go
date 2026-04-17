import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketingConfigDocument = MarketingConfig & Document;

@Schema({ _id: false })
class RateConfig {
  @Prop({ default: 10 })
  f1Rate: number; // 10%

  @Prop({ default: 15 })
  f2Rate: number; // 15%

  @Prop({ default: 25 })
  f3Rate: number; // 25%
}

@Schema({ _id: false })
class KpiMetric {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  target: number;
  
  @Prop()
  icon?: string;
  
  @Prop()
  color?: string;
}

@Schema({ _id: false })
class KpiTarget {
  @Prop()
  label: string; // e.g., '1 Tỉnh (≥ 15.000 GD) + Ký 3 Hợp đồng B2B'

  @Prop({ type: KpiMetric })
  metric1: KpiMetric;

  @Prop({ type: KpiMetric })
  metric2: KpiMetric;

  @Prop({ type: KpiMetric })
  metric3: KpiMetric;
}

@Schema({ _id: false })
class KpiConfig {
  @Prop({ type: KpiTarget })
  f1_lead: KpiTarget;

  @Prop({ type: KpiTarget })
  f2_sub_lead: KpiTarget;

  @Prop({ type: KpiTarget })
  f3_staff_mkt: KpiTarget;
}

@Schema({ timestamps: true })
export class MarketingConfig {
  @Prop({ default: 'default_config', unique: true })
  configId: string; // Singleton ID

  @Prop({ type: RateConfig, default: () => ({ f1Rate: 10, f2Rate: 15, f3Rate: 25 }) })
  rates: RateConfig;

  @Prop({
    type: KpiConfig,
    default: () => ({
      f1_lead: {
        label: '1 Tỉnh (≥ 15.000 GD) + Ký 3 Hợp đồng B2B',
        metric1: { name: 'Giao dịch toàn Vùng (GD)', target: 15000, icon: 'swap_horiz', color: '#2563eb' },
        metric2: { name: 'Hợp đồng B2B (Doanh nghiệp)', target: 3, icon: 'business', color: '#059669' },
        metric3: { name: 'Sub Lead (F2) hoạt động', target: 4, icon: 'group', color: '#7c3aed' }
      },
      f2_sub_lead: {
        label: '1 Huyện (≥ 4.500 GD) + Chăm sóc điểm Checkin',
        metric1: { name: 'Giao dịch toàn Huyện (GD)', target: 4500, icon: 'swap_horiz', color: '#2563eb' },
        metric2: { name: 'Điểm Check-in', target: 1, icon: 'location_on', color: '#059669' },
        metric3: { name: 'Sale (F3) hoạt động', target: 5, icon: 'group', color: '#7c3aed' }
      },
      f3_staff_mkt: {
        label: 'Cá Nhân (≥ 400 GD) + Tìm 10 Cộng tác viên',
        metric1: { name: 'Giao dịch Cá nhân (GD)', target: 400, icon: 'swap_horiz', color: '#2563eb' },
        metric2: { name: 'Cộng tác viên phát sinh', target: 10, icon: 'group_add', color: '#059669' },
        metric3: { name: 'Tài xế/Đối tác cá nhân tuyển', target: 15, icon: 'directions_car', color: '#7c3aed' }
      }
    })
  })
  kpis: KpiConfig;
}

export const MarketingConfigSchema = SchemaFactory.createForClass(MarketingConfig);
