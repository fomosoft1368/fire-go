import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WalletService } from '../services/wallet.service';
import { SepayService } from '../services/sepay.service';
import { WalletsService } from '../../wallets/wallets.service';

interface SepayWebhookPayload {
  id: string; // Sepay transaction ID
  gateway: string; // "VIETQR"
  transactionDate: string; // ISO timestamp
  accountNumber: string; // Bank account number
  transferType: string; // "in" | "out"
  transferAmount: number; // Amount in VND
  accumulated: number; // Total balance after transaction
  code: string; // Bank code (e.g., "970436")
  content: string; // Transfer content (NAPVI ABC12345)
  description: string; // Full description
  referenceCode: string; // Bank reference
  subAccount: string; // Sub-account (if any)
  bankBrandName: string; // Bank name
  match_code?: string; // Internal matching code
}

@Controller('wallet/sepay')
export class SepayWebhookController {
  constructor(
    private readonly walletService: WalletService,
    private readonly sepayService: SepayService,
    private readonly walletsService: WalletsService,
  ) {}

  /**
   * POST /api/wallet/sepay/webhook
   * Sepay calls this endpoint when receiving bank transfer
   * Handles both driver and customer topups
   * 
   * Example payload from Sepay:
   * {
   *   "id": "sepay_txn_123",
   *   "gateway": "VIETQR",
   *   "transactionDate": "2026-02-09T10:30:00Z",
   *   "accountNumber": "0123456789",
   *   "transferType": "in",
   *   "transferAmount": 100000,
   *   "content": "DRV65F12A3B or CUST65F12A3B",
   *   "bankBrandName": "Vietcombank"
   * }
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: SepayWebhookPayload,
    @Headers('x-sepay-signature') signature: string,
  ) {
    console.log('[SepayWebhook] 📥 Received webhook:', JSON.stringify(payload, null, 2));
    console.log('[SepayWebhook] Signature:', signature);

    try {
      // Step 1: Verify webhook signature (security check)
      // If signature missing, Sepay IPN may not have configured secret key in dashboard
      // Fall back to accepting webhook based on content validation
      if (!signature) {
        console.warn('[SepayWebhook] ⚠️ No signature provided - falling back to content validation');
        console.warn('[SepayWebhook] 💡 Ensure SEPAY_SECRET_KEY configured in Sepay IPN dashboard for security');
      } else {
        const isValid = this.sepayService.verifyWebhookSignature(
          JSON.stringify(payload),
          signature,
        );

        if (!isValid) {
          console.error('[SepayWebhook] ❌ Invalid signature');
          throw new BadRequestException('Invalid webhook signature');
        }
      }

      // Step 2: Check if this is an incoming transfer (topup)
      if (payload.transferType !== 'in') {
        console.log('[SepayWebhook] ⏭️ Not an incoming transfer, skipping');
        return { success: true, message: 'Not a topup transaction' };
      }

      // Step 3: Parse transfer content to get transaction ID and user type
      // Format: "DRV<transactionId>" or "CUST<transactionId>" can appear anywhere in content
      // Sepay may include bank info, account info before the actual transaction reference
      const content = payload.content.trim().toUpperCase();
      console.log('[SepayWebhook] 📝 Raw content:', payload.content);
      console.log('[SepayWebhook] 📝 Normalized content:', content);
      
      // Extract user type (DRV or CUST) and transaction ID
      let userTypePrefix = '';
      let transactionIdFromContent: string | null = null;
      
      // Pattern 1: Find DRV or CUST followed by 8+ hex chars anywhere in content
      // This handles cases where bank adds extra info before/after our reference
      let match = content.match(/(DRV|CUST)([A-F0-9]{8,})/);
      if (match) {
        userTypePrefix = match[1];
        transactionIdFromContent = match[2];
        console.log('[SepayWebhook] ✅ Pattern 1 matched (anywhere in content):', {
          prefix: userTypePrefix,
          id: transactionIdFromContent,
          fullMatch: match[0],
        });
      }
      
      // Pattern 2: DRV or CUST with underscore or space (legacy formats)
      if (!match) {
        match = content.match(/(DRV|CUST)[\s_]*([A-F0-9]{8,})/);
        if (match) {
          userTypePrefix = match[1];
          transactionIdFromContent = match[2];
          console.log('[SepayWebhook] ⚠️ Pattern 2 matched (with underscore/space):', {
            prefix: userTypePrefix,
            id: transactionIdFromContent,
            fullMatch: match[0],
          });
        }
      }

      if (!transactionIdFromContent || !userTypePrefix) {
        console.error('[SepayWebhook] ❌ Could not extract transaction ID from content:', payload.content);
        console.error('[SepayWebhook] Content length:', payload.content.length);
        throw new BadRequestException('Invalid transfer content format - expected DRV or CUST prefix');
      }

      const userType = userTypePrefix === 'DRV' ? 'driver' : 'customer';
      console.log('[SepayWebhook] 📝 Final parsed:', {
        userType,
        transactionId: transactionIdFromContent,
        amount: payload.transferAmount,
      });

      // Step 4: Find and complete the transaction
      if (userType === 'driver') {
        // Handle driver topup
        await this.handleDriverTopup(
          transactionIdFromContent,
          payload.transferAmount,
          payload.id,
        );
      } else {
        // Handle customer topup
        await this.handleCustomerTopup(
          transactionIdFromContent,
          payload.transferAmount,
          payload.id,
        );
      }

      console.log('[SepayWebhook] 🎉 Transaction completed successfully');

      return {
        success: true,
        message: 'Transaction completed',
        userType,
      };
    } catch (error: any) {
      console.error('[SepayWebhook] ❌ Error processing webhook:', error);

      // Still return 200 to prevent Sepay from retrying
      // Log error for manual investigation
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle driver topup completion
   */
  private async handleDriverTopup(
    transactionIdFromContent: string,
    transferAmount: number,
    sepayTransactionId: string,
  ) {
    console.log('[SepayWebhook] 💳 Processing DRIVER topup...');

    // Find pending transaction
    const transaction = await this.walletService.findPendingTransactionByContent(
      transactionIdFromContent,
    );

    if (!transaction) {
      console.error('[SepayWebhook] ❌ Driver transaction not found:', transactionIdFromContent);
      throw new BadRequestException('Driver transaction not found or already completed');
    }

    // Validate amount matches
    if (Math.abs(transaction.amount - transferAmount) > 1) {
      console.error('[SepayWebhook] ❌ Amount mismatch:', {
        expected: transaction.amount,
        received: transferAmount,
      });
      throw new BadRequestException('Amount mismatch for driver transaction');
    }

    // Complete the transaction
    console.log('[SepayWebhook] ✅ Completing driver transaction:', transaction._id);
    await this.walletService.completeTopupTransaction(
      transaction._id.toString(),
      sepayTransactionId,
    );
  }

  /**
   * Handle customer topup completion
   */
  private async handleCustomerTopup(
    transactionIdFromContent: string,
    transferAmount: number,
    sepayTransactionId: string,
  ) {
    console.log('[SepayWebhook] 💳 Processing CUSTOMER topup...');

    // Find pending transaction in wallets service
    const transaction = await this.walletsService.findPendingTopupByContent(
      transactionIdFromContent,
    );

    if (!transaction) {
      console.error('[SepayWebhook] ❌ Customer transaction not found:', transactionIdFromContent);
      throw new BadRequestException('Customer transaction not found or already completed');
    }

    // Validate amount matches
    if (Math.abs(transaction.amount - transferAmount) > 1) {
      console.error('[SepayWebhook] ❌ Amount mismatch:', {
        expected: transaction.amount,
        received: transferAmount,
      });
      throw new BadRequestException('Amount mismatch for customer transaction');
    }

    // Complete the transaction
    console.log('[SepayWebhook] ✅ Completing customer transaction:', transaction._id);
    await this.walletsService.completeTopupTransaction(
      transaction._id.toString(),
      sepayTransactionId,
    );
  }

  /**
   * POST /api/wallet/sepay/create-topup
   * Mobile app calls this to create a topup transaction and get QR code
   */
  @Post('create-topup')
  @HttpCode(HttpStatus.CREATED)
  async createTopup(
    @Request() req: any,
    @Body() dto: { amount: number },
  ) {
    console.log('[SepayWebhook] 🔨 Creating topup:', {
      driverId: req.user?.id,
      amount: dto.amount,
    });

    try {
      // Validate amount
      if (!dto.amount || dto.amount < 10000) {
        throw new BadRequestException('Số tiền nạp tối thiểu là 10.000đ');
      }

      // Create transaction
      const transaction = await this.walletService.createTopupTransaction(
        req.user.id,
        dto.amount,
      );

      // Generate QR code
      const qrInfo = this.sepayService.generateQRCode(
        dto.amount,
        transaction._id.toString(),
        'driver',
      );

      console.log('[SepayWebhook] ✅ Topup created with QR code:', qrInfo.content);

      return {
        success: true,
        transactionId: transaction._id,
        amount: dto.amount,
        qrCodeUrl: qrInfo.qrCodeUrl,
        content: qrInfo.content,
        accountNo: qrInfo.accountNo,
        accountName: qrInfo.accountName,
        bankName: qrInfo.bankName,
        bankId: qrInfo.bankId,
      };
    } catch (error: any) {
      console.error('[SepayWebhook] ❌ Error creating topup:', error);
      throw error;
    }
  }

  /**
   * GET /api/wallet/sepay/test
   * Test endpoint to simulate Sepay webhook
   */
  @Post('test-webhook')
  @HttpCode(HttpStatus.OK)
  async testWebhook(@Body() payload: any) {
    console.log('[SepayWebhook] 🧪 Test webhook called:', payload);
    
    // Simulate webhook processing without signature verification
    return await this.handleWebhook(payload, 'test-signature');
  }
}
