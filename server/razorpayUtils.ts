import crypto from 'node:crypto';
import type { Order } from '../src/types/print';

export function verifyRazorpayCheckoutSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!razorpayOrderId || !razorpayPaymentId || !signature || !secret) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export function verifyRazorpayWebhookSignature(
  rawBody: Buffer | string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export interface PaymentVerificationPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
  currency: string;
  status: string;
  actor: string;
  nowIso: string;
}

export interface PaymentTransitionResult {
  order: Order;
  alreadyPaid: boolean;
  transitionedToPaid: boolean;
}

/**
 * Idempotent, out-of-order-safe transactional payment state updater.
 * Used identically by both Checkout Verification and Razorpay Webhook handlers.
 */
export function applyVerifiedPaymentTransition(
  existingOrder: Order,
  payment: PaymentVerificationPayload
): PaymentTransitionResult {
  if (existingOrder.razorpayOrderId !== payment.razorpayOrderId) {
    throw new Error('Razorpay order ID mismatch.');
  }
  if (payment.currency !== 'INR' || existingOrder.currency !== 'INR') {
    throw new Error(`Invalid currency: expected INR, received ${payment.currency}.`);
  }
  if (payment.amountPaise !== existingOrder.totalPaise) {
    throw new Error(
      `Amount mismatch: expected ${existingOrder.totalPaise} paise, received ${payment.amountPaise} paise.`
    );
  }

  // Idempotent guard: if already paid, never duplicate fulfillment or revert progress
  if (existingOrder.paymentStatus === 'paid') {
    return {
      order: existingOrder,
      alreadyPaid: true,
      transitionedToPaid: false,
    };
  }

  if (payment.status === 'captured') {
    const nextFulfillment =
      existingOrder.fulfillmentStatus === 'awaiting_payment'
        ? existingOrder.deliveryMethod === 'digital'
          ? 'completed'
          : 'artwork_review'
        : existingOrder.fulfillmentStatus;

    const historyNote =
      existingOrder.deliveryMethod === 'digital'
        ? `Payment verified (${payment.razorpayPaymentId}) via ${payment.actor}. Design prompt(s) unlocked for customer.`
        : `Payment verified (${payment.razorpayPaymentId}) via ${payment.actor}. Order moved into queue.`;

    const updatedOrder: Order = {
      ...existingOrder,
      paymentStatus: 'paid',
      fulfillmentStatus: nextFulfillment,
      razorpayPaymentId: payment.razorpayPaymentId,
      paymentFailureReason: undefined,
      updatedAt: payment.nowIso,
      fulfillmentHistory: [
        ...existingOrder.fulfillmentHistory,
        {
          status: nextFulfillment,
          note: historyNote,
          updatedBy: payment.actor,
          timestamp: payment.nowIso,
        },
      ],
    };

    return {
      order: updatedOrder,
      alreadyPaid: false,
      transitionedToPaid: true,
    };
  }

  if (payment.status === 'failed') {
    // Out-of-order safety: never downgrade a paid order, already handled above
    const updatedOrder: Order = {
      ...existingOrder,
      paymentStatus: 'failed',
      razorpayPaymentId: payment.razorpayPaymentId,
      paymentFailureReason: `Payment failed (${payment.razorpayPaymentId}). You can retry payment anytime.`,
      updatedAt: payment.nowIso,
    };
    return {
      order: updatedOrder,
      alreadyPaid: false,
      transitionedToPaid: false,
    };
  }

  // Authorized / created / awaiting capture
  return {
    order: {
      ...existingOrder,
      razorpayPaymentId: payment.razorpayPaymentId,
      updatedAt: payment.nowIso,
    },
    alreadyPaid: false,
    transitionedToPaid: false,
  };
}
