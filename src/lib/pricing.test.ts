import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_PRODUCTS, DEFAULT_STORE_SETTINGS } from './catalogDefaults';
import {
  buildTailoredOrderPrompt,
  calculateItemPricing,
  calculateOrderTotals,
  canTransitionFulfillment,
  formatInrFromPaise,
  validateArtworkFile,
} from './pricing';

test('calculateItemPricing computes exact integer paise for valid options and tier', () => {
  const websiteProduct = SAMPLE_PRODUCTS[0]; // base 149900
  const priced = calculateItemPricing(
    websiteProduct,
    {
      scope: 'multi-store', // +50000
      style: 'minimal-editorial', // +20000
      delivery: 'tailored', // +40000, +1d
    },
    3 // multiplier 1.75
  );
  // (149900 + 50000 + 20000 + 40000) * 1.75 = 259900 * 1.75 = 454825
  assert.equal(priced.unitPackPricePaise, 454825);
  assert.match(priced.turnaroundDays, /\+1d custom/);
  assert.equal(priced.selectedOptionLabels.scope, 'Multi-Page Storefront Prompt');
});

test('calculateItemPricing rejects tampered option or quantity tier', () => {
  const cardProduct = SAMPLE_PRODUCTS[1];
  assert.throws(() =>
    calculateItemPricing(
      cardProduct,
      { format: 'tampered-free', sides: 'double' },
      1
    )
  );
  assert.throws(() =>
    calculateItemPricing(
      cardProduct,
      { format: 'landscape', sides: 'double' },
      99999
    )
  );
});

test('calculateOrderTotals computes digital ₹0 delivery, shipping, pickup, and GST in integer paise', () => {
  const digitalOrder = calculateOrderTotals(
    [{ unitPackPricePaise: 100000 }],
    'digital',
    DEFAULT_STORE_SETTINGS
  );
  // subtotal 100000 + ₹0 digital delivery; 18% GST = 18000; total = 118000
  assert.equal(digitalOrder.subtotalPaise, 100000);
  assert.equal(digitalOrder.shippingPaise, 0);
  assert.equal(digitalOrder.taxPaise, 18000);
  assert.equal(digitalOrder.totalPaise, 118000);

  const physicalSettings = {
    gstPercentage: 18,
    shippingFeePaise: 12000,
    freeShippingThresholdPaise: 249900,
    pickupEnabled: true,
    shippingEnabled: true,
  };
  const belowThreshold = calculateOrderTotals(
    [{ unitPackPricePaise: 100000 }],
    'shipping',
    physicalSettings
  );
  assert.equal(belowThreshold.shippingPaise, 12000);
  assert.equal(belowThreshold.taxPaise, 20160);
  assert.equal(belowThreshold.totalPaise, 132160);

  const pickup = calculateOrderTotals(
    [{ unitPackPricePaise: 100000 }],
    'pickup',
    physicalSettings
  );
  assert.equal(pickup.shippingPaise, 0);
  assert.equal(pickup.taxPaise, 18000);
  assert.equal(pickup.totalPaise, 118000);
});

test('formatInrFromPaise formats clean INR strings', () => {
  assert.equal(formatInrFromPaise(89900), '₹899');
  assert.equal(formatInrFromPaise(149950), '₹1,499.50');
});

test('validateArtworkFile enforces PDF/PNG/JPEG and size limits', () => {
  assert.equal(validateArtworkFile('brand.pdf', 'application/pdf', 1024 * 500, 25).valid, true);
  assert.equal(validateArtworkFile('logo.png', 'image/png', 1024 * 500, 25).valid, true);
  assert.equal(validateArtworkFile('ref.jpg', 'image/jpeg', 1024 * 500, 25).valid, true);

  const badType = validateArtworkFile('malware.exe', 'application/x-msdownload', 1024, 25);
  assert.equal(badType.valid, false);

  const tooBig = validateArtworkFile('huge.pdf', 'application/pdf', 30 * 1024 * 1024, 25);
  assert.equal(tooBig.valid, false);
});

test('canTransitionFulfillment blocks unpaid unlock and enforces valid digital & print stages', () => {
  const unpaid = canTransitionFulfillment('awaiting_payment', 'completed', 'pending', 'digital');
  assert.equal(unpaid.allowed, false);

  const digitalUnlock = canTransitionFulfillment('awaiting_payment', 'completed', 'paid', 'digital');
  assert.equal(digitalUnlock.allowed, true);

  const digitalComplete = canTransitionFulfillment('artwork_review', 'completed', 'paid', 'digital');
  assert.equal(digitalComplete.allowed, true);

  const skipPrintStage = canTransitionFulfillment('artwork_review', 'shipped', 'paid', 'shipping');
  assert.equal(skipPrintStage.allowed, false);

  const validShip = canTransitionFulfillment('printing', 'shipped', 'paid', 'shipping');
  assert.equal(validShip.allowed, true);
});

test('buildTailoredOrderPrompt appends selected specs and customer brand brief cleanly', () => {
  const result = buildTailoredOrderPrompt(
    'Design a luxury business card for [COMPANY_NAME].',
    { format: 'Horizontal', sides: 'Front & Back' },
    'Sri Sai Traders, Teal & Gold'
  );
  assert.match(result, /Design a luxury business card/);
  assert.match(result, /format: Horizontal/);
  assert.match(result, /Sri Sai Traders, Teal & Gold/);
});
