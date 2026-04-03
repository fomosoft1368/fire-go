import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppSettingsService } from './app-settings.service';
import { AppSettingsController } from './app-settings.controller';
import { AppSetting, AppSettingSchema } from './schemas/app-setting.schema';
import { AuthModule } from '../auth/auth.module';

@Global() // ← Global để mọi module đều inject được AppSettingsService mà không cần import
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppSetting.name, schema: AppSettingSchema },
    ]),
    AuthModule,
  ],
  controllers: [AppSettingsController],
  providers: [AppSettingsService],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
