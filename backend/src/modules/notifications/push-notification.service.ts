import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  /**
   * Save Expo push token for a driver
   */
  async saveDriverPushToken(driverId: string, token: string): Promise<void> {
    await this.driverModel.findByIdAndUpdate(driverId, { expoPushToken: token });
    this.logger.log(`🔔 [Driver] Push token saved: ${driverId} -> ${token.substring(0, 30)}...`);
  }

  /**
   * Save Expo push token for a customer (Customer collection)
   */
  async saveCustomerPushToken(customerId: string, token: string): Promise<void> {
    // ✅ Customers are in Customer collection, NOT User collection
    await this.customerModel.findByIdAndUpdate(customerId, { expoPushToken: token });
    this.logger.log(`🔔 [Customer] Push token saved: ${customerId} -> ${token.substring(0, 30)}...`);
  }

  /**
   * Send push notification to a driver
   */
  async sendToDriver(
    driverId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    try {
      const driver = await this.driverModel.findById(driverId).select('expoPushToken firstName').lean() as any;
      if (!driver) {
        this.logger.warn(`⚠️ [Driver] Not found in DB: ${driverId}`);
        return;
      }
      if (!driver.expoPushToken) {
        this.logger.warn(`⚠️ [Driver] No push token registered: ${driverId} (${driver.firstName || ''})`);
        return;
      }
      this.logger.log(`📤 [Driver] Sending push to ${driverId}: "${title}"`);
      await this.sendPush([driver.expoPushToken], title, body, data);
    } catch (error) {
      this.logger.error(`Failed to send push to driver ${driverId}:`, error.message);
    }
  }

  /**
   * Send push notification to a customer (Customer collection)
   */
  async sendToCustomer(
    customerId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    try {
      // ✅ Lookup from Customer collection (not User)
      const customer = await this.customerModel.findById(customerId).select('expoPushToken firstName').lean() as any;
      if (!customer) {
        this.logger.warn(`⚠️ [Customer] Not found in DB: ${customerId}`);
        return;
      }
      if (!customer.expoPushToken) {
        this.logger.warn(`⚠️ [Customer] No push token registered: ${customerId} (${customer.firstName || ''})`);
        return;
      }
      this.logger.log(`📤 [Customer] Sending push to ${customerId}: "${title}"`);
      await this.sendPush([customer.expoPushToken], title, body, data);
    } catch (error) {
      this.logger.error(`Failed to send push to customer ${customerId}:`, error.message);
    }
  }

  /**
   * Send push to multiple tokens (Expo batch API)
   */
  async sendPush(tokens: string[], title: string, body: string, data?: Record<string, any>): Promise<void> {
    // Filter valid Expo push tokens
    const validTokens = tokens.filter(t => t && t.startsWith('ExponentPushToken['));

    console.log(`\n\ud83d\udce1 ===== EXPO PUSH DISPATCH =====`);
    console.log(`\ud83d\udcf1 Tokens total: ${tokens.length} | Valid: ${validTokens.length}`);
    console.log(`\ud83d\udcec Title: "${title}"`);
    console.log(`\ud83d\udcdd Body: "${body}"`);
    validTokens.forEach((t, i) => console.log(`   Token[${i}]: ${t.substring(0, 45)}...`));

    if (validTokens.length === 0) {
      console.log('\u26a0\ufe0f No valid ExponentPushToken[] found \u2014 push skipped.');
      console.log(`==============================\n`);
      return;
    }

    const messages: PushMessage[] = validTokens.map(token => ({
      to: token,
      title,
      body,
      data: data || {},
      sound: 'default',
      priority: 'high',
    }));

    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json() as any;
      console.log(`\ud83c\udf10 Expo API response status: ${response.status}`);
      console.log(`\ud83d\udce6 Expo API result:`, JSON.stringify(result, null, 2));

      if (result.data) {
        result.data.forEach((r: any, i: number) => {
          if (r.status === 'error') {
            console.log(`\u274c [${i}] Push ERROR: ${r.message} (${r.details?.error})`);
          } else {
            console.log(`\u2705 [${i}] Push OK \u2014 receipt ID: ${r.id}`);
          }
        });
      }
    } catch (error) {
      console.log(`\ud83d\udd34 Expo push API request failed: ${error.message}`);
    }
    console.log(`==============================\n`);
  }
}
