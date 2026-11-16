import type { Order } from '../types/print';

export interface RazorpayModalOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  remember_customer?: boolean;
  retry?: {
    enabled?: boolean;
    max_count?: number;
  };
  notes?: Record<string, string>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (res: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayModalOptions) => RazorpayInstance;
  }
}

const CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export async function ensureRazorpayCheckoutLoaded(): Promise<
  NonNullable<Window['Razorpay']>
> {
  if (typeof window === 'undefined') {
    throw new Error('Razorpay Checkout is only available in the browser.');
  }
  if (window.Razorpay) {
    return window.Razorpay;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SCRIPT_SRC}"]`
    );
    if (existing) {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Razorpay Checkout script failed to load. Please refresh and try again.'));
      };
      const cleanup = () => {
        existing.removeEventListener('load', onLoad);
        existing.removeEventListener('error', onError);
      };
      existing.addEventListener('load', onLoad);
      existing.addEventListener('error', onError);
      // Fallback timeout in case async script already errored before listener attached
      setTimeout(() => {
        cleanup();
        if (window.Razorpay) {
          resolve();
        } else {
          reject(new Error('Razorpay Checkout script failed to load. Please refresh the page.'));
        }
      }, 6000);
      return;
    }

    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Razorpay Checkout script failed to load. Please check your connection.'));
    document.head.appendChild(script);
  });

  if (!window.Razorpay) {
    throw new Error('Razorpay Checkout failed to initialize.');
  }
  return window.Razorpay;
}

export type RazorpayRetryResponse = {
  order: Order;
  razorpay: { keyId: string; orderId: string; amountPaise: number; currency: string } | null;
};

export function extractRazorpayFailure(failRes: unknown) {
  const fallback = 'Razorpay payment failed. Please try again.';
  if (typeof failRes === 'object' && failRes !== null && 'error' in failRes) {
    const error = (failRes as { error?: {
      description?: unknown;
      code?: unknown;
      source?: unknown;
      step?: unknown;
      reason?: unknown;
      metadata?: { payment_id?: unknown };
    } }).error;
    const description = typeof error?.description === 'string' ? error.description.trim() : '';
    const reason = typeof error?.reason === 'string' ? error.reason.trim() : '';
    return {
      reason: description || (reason ? `Payment failed: ${reason}` : fallback),
      failure: {
        code: error?.code,
        source: error?.source,
        step: error?.step,
        reason: error?.reason,
        paymentId: error?.metadata?.payment_id,
      },
    };
  }
  return { reason: fallback };
}
