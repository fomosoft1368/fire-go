import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { WalletService } from '../services/wallet.service';
import { SepayService } from '../services/sepay.service';

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

@Controller('api/wallet/sepay')
export class SepayWebhookController {
  constructor(
    private readonly walletService: WalletService,
    private readonly sepayService: SepayService,
  ) {}

  /**
   * POST /api/wallet/sepay/webhook
   * Sepay calls this endpoint when receiving bank transfer
   * 
   * Example payload from Sepay:
   * {
   *   "id": "sepay_txn_123",
   *   "gateway": "VIETQR",
   *   "transactionDate": "2026-02-09T10:30:00Z",
   *   "accountNumber": "0123456789",
   *   "transferType": "in",
   *   "transferAmount": 100000,
   *   "content": "NAPVI DRV_65f12a3b4c 1707471000",
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
      const isValid = this.sepayService.verifyWebhookSignature(
        JSON.stringify(payload),
        signature,
      );

      if (!isValid) {
        console.error('[SepayWebhook] ❌ Invalid signature');
        throw new BadRequestException('Invalid webhook signature');
      }

      // Step 2: Check if this is an incoming transfer (topup)
      if (payload.transferType !== 'in') {
        console.log('[SepayWebhook] ⏭️ Not an incoming transfer, skipping');
        return { success: true, message: 'Not a topup transaction' };
      }

      // Step 3: Parse transfer content to get transaction ID
      // Format: "DH<transactionId>" (DH followed by 8+ hex chars)
      const content = payload.content.trim().toUpperCase();
      console.log('[SepayWebhook] 📝 Raw content:', payload.content);
      console.log('[SepayWebhook] 📝 Normalized content:', content);
      
      // Try to extract transaction ID with multiple patterns
      let transactionIdFromContent: string | null = null;
      
      // Pattern 1: DH followed by ID (8-24 hex chars)
      let match = content.match(/DH([A-F0-9]{8,24})/i);
      if (match) {
        transactionIdFromContent = match[1];
        console.log('[SepayWebhook] ✅ Pattern 1 matched (DH + ID):', transactionIdFromContent);
      }
      
      // Pattern 2: DH with optional space
      if (!transactionIdFromContent) {
        match = content.match(/DH\s*([A-F0-9]{8,24})/i);
        if (match) {
          transactionIdFromContent = match[1];
          console.log('[SepayWebhook] ✅ Pattern 2 matched (DH + space + ID):', transactionIdFromContent);
        }
      }
      
      // Pattern 3: Just the last 8+ hex chars (fallback)
      if (!transactionIdFromContent) {
        match = content.match(/([A-F0-9]{8,24})/);
        if (match) {
          transactionIdFromContent = match[1];
          console.log('[SepayWebhook] ⚠️ Pattern 3 matched (raw hex):', transactionIdFromContent);
        }
      }

      if (!transactionIdFromContent) {
        console.error('[SepayWebhook] ❌ Could not extract transaction ID from content:', payload.content);
        throw new BadRequestException('Invalid transfer content format - no transaction ID found');
      }

      console.log('[SepayWebhook] 📝 Final extracted transaction ID:', transactionIdFromContent);

      // Step 4: Find pending transaction
      const transaction = await this.walletService.findPendingTransactionByContent(
        transactionIdFromContent,
      );

      if (!transaction) {
        console.error('[SepayWebhook] ❌ Transaction not found:', transactionIdFromContent);
        throw new BadRequestException('Transaction not found or already completed');
      }

      // Step 5: Validate amount matches
      if (Math.abs(transaction.amount - payload.transferAmount) > 1) {
        console.error('[SepayWebhook] ❌ Amount mismatch:', {
          expected: transaction.amount,
          received: payload.transferAmount,
        });
        throw new BadRequestException('Amount mismatch');
      }

      // Step 6: Complete the transaction (add money to wallet)
      console.log('[SepayWebhook] ✅ Completing transaction:', transaction._id);
      await this.walletService.completeTopupTransaction(
        transaction._id.toString(),
        payload.id, // Sepay transaction ID for reference
      );

      console.log('[SepayWebhook] 🎉 Transaction completed successfully');

      return {
        success: true,
        message: 'Transaction completed',
        transactionId: transaction._id,
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
