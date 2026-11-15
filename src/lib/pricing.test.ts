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
  const websiteProduct = SAMPLE_PRODUCTS[0]; // base 49900 (₹499)
  const basePriced = calculateItemPricing(
    websiteProduct,
    {
      scope: 'landing',
      style: 'sage-walnut',
      delivery: 'instant',
    },
    1
  );
  assert.equal(basePriced.unitPackPricePaise, 49900);

  const priced = calculateItemPricing(
    websiteProduct,
    {
      scope: 'multi-store', // +20000
      style: 'minimal-editorial', // +10000
      delivery: 'tailored', // +20000, +1d
    },
    3 // multiplier 1.4
  );
  // (49900 + 20000 + 10000 + 20000) * 1.4 = 99900 * 1.4 = 139860 (₹1,398.60)
  assert.equal(priced.unitPackPricePaise, 139860);
  assert.match(priced.turnaroundDays, /\+1d custom/);
  assert.equal(priced.selectedOptionLabels.scope, 'Multi-Page Storefront Prompt');
});

test('catalog keeps exactly one product with ₹499 (49900 paise) minimum price', () => {
  assert.equal(SAMPLE_PRODUCTS.length, 1);
  const product = SAMPLE_PRODUCTS[0];
  assert.equal(product.basePricePaise, 49900);

  const minChoiceSum = product.optionGroups.reduce(
    (sum, g) => sum + Math.min(...g.choices.map((c) => c.priceDeltaPaise)),
    0
  );
  const minMultiplier = Math.min(...product.quantityTiers.map((t) => t.multiplier));
  const lowestPack = Math.round((product.basePricePaise + minChoiceSum) * minMultiplier);
  assert.equal(lowestPack, 49900);
});

test('calculateItemPricing rejects tampered option or quantity tier', () => {
  const product = SAMPLE_PRODUCTS[0];
  assert.throws(() =>
    calculateItemPricing(
      product,
      { scope: 'tampered-free', style: 'sage-walnut', delivery: 'instant' },
      1
    )
  );
  assert.throws(() =>
    calculateItemPricing(
      product,
      { scope: 'landing', style: 'sage-walnut', delivery: 'instant' },
      99999
    )
  );
});

test('calculateOrderTotals computes digital ₹0 delivery, shipping, and pickup without GST in integer paise', () => {
  const digitalOrder = calculateOrderTotals(
    [{ unitPackPricePaise: 100000 }],
    'digital',
    DEFAULT_STORE_SETTINGS
  );
  // subtotal 100000 + ₹0 digital delivery; ₹0 tax; total = 100000
  assert.equal(digitalOrder.subtotalPaise, 100000);
  assert.equal(digitalOrder.shippingPaise, 0);
  assert.equal(digitalOrder.taxPaise, 0);
  assert.equal(digitalOrder.totalPaise, 100000);

  const physicalSettings = {
    gstPercentage: 0,
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
  assert.equal(belowThreshold.taxPaise, 0);
  assert.equal(belowThreshold.totalPaise, 112000);

  const pickup = calculateOrderTotals(
    [{ unitPackPricePaise: 100000 }],
    'pickup',
    physicalSettings
  );
  assert.equal(pickup.shippingPaise, 0);
  assert.equal(pickup.taxPaise, 0);
  assert.equal(pickup.totalPaise, 100000);
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
