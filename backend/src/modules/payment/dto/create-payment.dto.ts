export class CreatePaymentDto {
  amount: number;

  orderInfo: string;

  orderType?: string;

  language?: string = 'vn';
}

export class VNPayCallbackDto {
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo: string;
  vnp_CardType: string;
  vnp_Command: string;
  vnp_CreateDate: string;
  vnp_CurrCode: string;
  vnp_OrderInfo: string;
  vnp_OrderType: string;
  vnp_PayDate: string;
  vnp_ResponseCode: string;
  vnp_TmnCode: string;
  vnp_TransactionNo: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
}
