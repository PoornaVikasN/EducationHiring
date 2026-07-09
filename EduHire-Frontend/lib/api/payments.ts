import { apiClient } from '../api-client';
import { PaymentKind, PaymentStatus } from '../shared/enums';

export interface RazorpayOrder {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface PaymentRecord {
  _id: string;
  kind: PaymentKind;
  status: PaymentStatus;
  amountPaise: number;
  userId: string;
  entityId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

export interface PaginatedPayments {
  data: PaymentRecord[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const paymentsApi = {
  createOrder: (kind: PaymentKind, entityId: string) =>
    apiClient.post<RazorpayOrder>('/payments/order', { kind, entityId }),

  verify: (razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string) =>
    apiClient.post('/payments/verify', { razorpay_order_id, razorpay_payment_id, razorpay_signature }),

  adminList: (page = 1, limit = 20) =>
    apiClient.get<PaginatedPayments>('/payments/admin', { params: { page, limit } }),
};
