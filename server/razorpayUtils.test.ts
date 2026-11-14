import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { Order } from '../src/types/print';
import {
  applyVerifiedPaymentTransition,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from './razorpayUtils';

function makePendingOrder(deliveryMethod: Order['deliveryMethod'] = 'digital'): Order {
  return {
    id: 'ord_test_1',
    orderNumber: 'SPP-2026-0001',
    userId: 'user_abc',
    customerEmail: 'customer@example.com',
    customerName: 'Aarav Rao',
    customerPhone: '+91 9876543210',
    deliveryMethod,
    items: [],
    subtotalPaise: 100000,
    shippingPaise: deliveryMethod === 'shipping' ? 12000 : 0,
    taxPaise: deliveryMethod === 'shipping' ? 20160 : 18000,
    totalPaise: deliveryMethod === 'shipping' ? 132160 : 118000,
    currency: 'INR',
    paymentStatus: 'pending',
    fulfillmentStatus: 'awaiting_payment',
    razorpayOrderId: 'order_rzp_123',
    fulfillmentHistory: [
      {
        status: 'awaiting_payment',
        note: 'Order created awaiting Razorpay payment.',
        updatedBy: 'system',
        timestamp: '2026-11-14T00:00:00.000Z',
      },
    ],
    createdAt: '2026-11-14T00:00:00.000Z',
    updatedAt: '2026-11-14T00:00:00.000Z',
  };
}

test('verifyRazorpayCheckoutSignature validates authentic HMAC-SHA256 and rejects tampering', () => {
  const secret = 'rzp_test_secret_123';
  const orderId = 'order_rzp_123';
  const paymentId = 'pay_rzp_456';
  const validSig = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.equal(verifyRazorpayCheckoutSignature(orderId, paymentId, validSig, secret), true);
  assert.equal(verifyRazorpayCheckoutSignature(orderId, 'pay_tampered', validSig, secret), false);
  assert.equal(verifyRazorpayCheckoutSignature(orderId, paymentId, 'bad_sig', secret), false);
});

test('verifyRazorpayWebhookSignature validates raw body buffer against webhook secret', () => {
  const webhookSecret = 'whsec_test_999';
  const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: {} }), 'utf8');
  const validSig = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

  assert.equal(verifyRazorpayWebhookSignature(rawBody, validSig, webhookSecret), true);
  assert.equal(
    verifyRazorpayWebhookSignature(Buffer.from('{"tampered":true}'), validSig, webhookSecret),
    false
  );
});

test('applyVerifiedPaymentTransition unlocks digital design order immediately and ignores duplicate webhooks', () => {
  const pending = makePendingOrder('digital');

  const first = applyVerifiedPaymentTransition(pending, {
    razorpayOrderId: 'order_rzp_123',
    razorpayPaymentId: 'pay_rzp_456',
    amountPaise: 118000,
    currency: 'INR',
    status: 'captured',
    actor: 'checkout_verify',
    nowIso: '2026-11-14T01:00:00.000Z',
  });

  assert.equal(first.transitionedToPaid, true);
  assert.equal(first.alreadyPaid, false);
  assert.equal(first.order.paymentStatus, 'paid');
  assert.equal(first.order.fulfillmentStatus, 'completed');
  assert.equal(first.order.fulfillmentHistory.length, 2);

  // Duplicate webhook or refresh retry must NOT repeat fulfillment history
  const duplicate = applyVerifiedPaymentTransition(first.order, {
    razorpayOrderId: 'order_rzp_123',
    razorpayPaymentId: 'pay_rzp_456',
    amountPaise: 118000,
    currency: 'INR',
    status: 'captured',
    actor: 'razorpay_webhook',
    nowIso: '2026-11-14T01:05:00.000Z',
  });

  assert.equal(duplicate.alreadyPaid, true);
  assert.equal(duplicate.transitionedToPaid, false);
  assert.equal(duplicate.order.fulfillmentStatus, 'completed');
  assert.equal(duplicate.order.fulfillmentHistory.length, 2);
});

test('applyVerifiedPaymentTransition rejects tampered amount and handles out-of-order failed event after paid', () => {
  const pending = makePendingOrder('digital');
  assert.throws(() =>
    applyVerifiedPaymentTransition(pending, {
      razorpayOrderId: 'order_rzp_123',
      razorpayPaymentId: 'pay_rzp_456',
      amountPaise: 100, // tampered!
      currency: 'INR',
      status: 'captured',
      actor: 'checkout_verify',
      nowIso: '2026-11-14T01:00:00.000Z',
    })
  );

  // Out-of-order failed event after order already paid must NOT downgrade paid status
  const paidOrder: Order = {
    ...pending,
    paymentStatus: 'paid',
    fulfillmentStatus: 'completed',
    razorpayPaymentId: 'pay_rzp_456',
  };
  const outOfOrder = applyVerifiedPaymentTransition(paidOrder, {
    razorpayOrderId: 'order_rzp_123',
    razorpayPaymentId: 'pay_old_fail',
    amountPaise: 118000,
    currency: 'INR',
    status: 'failed',
    actor: 'razorpay_webhook',
    nowIso: '2026-11-14T01:10:00.000Z',
  });
  assert.equal(outOfOrder.order.paymentStatus, 'paid');
  assert.equal(outOfOrder.order.fulfillmentStatus, 'completed');
});
