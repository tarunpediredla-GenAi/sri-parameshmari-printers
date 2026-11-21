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

test('calculateItemPricing computes exact integer paise for ₹20,000 and ₹5,000 design options and tiers', () => {
  const enterpriseProduct = SAMPLE_PRODUCTS.find((p) => p.id === 'prod-enterprise-website-design')!;
  const baseEnterprise = calculateItemPricing(
    enterpriseProduct,
    {
      scope: 'multi-store',
      style: 'sage-walnut',
      delivery: 'instant',
    },
    1
  );
  assert.equal(baseEnterprise.unitPackPricePaise, 2000000); // ₹20,000

  const websiteProduct = SAMPLE_PRODUCTS.find((p) => p.id === 'prod-ecommerce-website-design')!;
  const basePriced = calculateItemPricing(
    websiteProduct,
    {
      scope: 'landing',
      style: 'sage-walnut',
      delivery: 'instant',
    },
    1
  );
  assert.equal(basePriced.unitPackPricePaise, 500000); // ₹5,000

  const priced = calculateItemPricing(
    websiteProduct,
    {
      scope: 'multi-store', // +250000
      style: 'minimal-editorial', // +100000
      delivery: 'tailored', // +150000, +1d
    },
    3 // multiplier 1.4
  );
  // (500000 + 250000 + 100000 + 150000) * 1.4 = 1000000 * 1.4 = 1400000 (₹14,000)
  assert.equal(priced.unitPackPricePaise, 1400000);
  assert.match(priced.turnaroundDays, /\+1d custom/);
  assert.equal(priced.selectedOptionLabels.scope, '5-Page Business Website Prompt');
});

test('catalog includes curated designs across categories with ₹5,000 and ₹20,000 rates', () => {
  assert.ok(SAMPLE_PRODUCTS.length >= 6);
  const prices = SAMPLE_PRODUCTS.map((p) => p.basePricePaise);
  assert.ok(prices.includes(500000), 'Expected a ₹5,000 design package');
  assert.ok(prices.includes(2000000), 'Expected a ₹20,000 design package');

  for (const product of SAMPLE_PRODUCTS) {
    const minChoiceSum = product.optionGroups.reduce(
      (sum, g) => sum + Math.min(...g.choices.map((c) => c.priceDeltaPaise)),
      0
    );
    const minMultiplier = Math.min(...product.quantityTiers.map((t) => t.multiplier));
    const lowestPack = Math.round((product.basePricePaise + minChoiceSum) * minMultiplier);
    assert.ok(lowestPack >= 500000, `${product.id} should be rated at least ₹5,000`);
  }
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
      { scope: 'multi-store', style: 'sage-walnut', delivery: 'instant' },
      99999
    )
  );
});

test('calculateOrderTotals computes digital ₹0 delivery, shipping, and pickup without GST in integer paise', () => {
  const digitalOrder = calculateOrderTotals(
    [{ unitPackPricePaise: 2000000 }],
    'digital',
    DEFAULT_STORE_SETTINGS
  );
  // subtotal 2000000 (₹20,000) + ₹0 digital delivery; ₹0 tax; total = 2000000
  assert.equal(digitalOrder.subtotalPaise, 2000000);
  assert.equal(digitalOrder.shippingPaise, 0);
  assert.equal(digitalOrder.taxPaise, 0);
  assert.equal(digitalOrder.totalPaise, 2000000);

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
  assert.equal(formatInrFromPaise(500000), '₹5,000');
  assert.equal(formatInrFromPaise(2000000), '₹20,000');
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
