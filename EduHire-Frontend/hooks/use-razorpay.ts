'use client';

import { useCallback } from 'react';
import { paymentsApi } from '../lib/api/payments';
import { PaymentKind } from '../lib/shared/enums';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open(): void };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

function loadRazorpayScript(): Promise<boolean> {
  if (document.getElementById('razorpay-script')) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.id = 'razorpay-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function useRazorpay() {
  const pay = useCallback(async (
    kind: PaymentKind,
    entityId: string,
    description: string,
    onSuccess?: () => void,
    onFailure?: (err?: unknown) => void,
  ) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      onFailure?.(new Error('Razorpay SDK failed to load'));
      return;
    }

    const { data: order } = await paymentsApi.createOrder(kind, entityId);

    const rzp = new window.Razorpay({
      key: order.keyId ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'SchoolTeacher',
      description,
      handler: async (response) => {
        try {
          await paymentsApi.verify(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
          );
          onSuccess?.();
        } catch (err) {
          onFailure?.(err);
        }
      },
      modal: { ondismiss: () => onFailure?.() },
      theme: { color: '#3949ab' },
    });

    rzp.open();
  }, []);

  return { pay };
}
