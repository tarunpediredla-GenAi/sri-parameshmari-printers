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
  const websiteProduct = SAMPLE_PRODUCTS[0]; // base 1500000 (₹15,000)
  const priced = calculateItemPricing(
    websiteProduct,
    {
      scope: 'multi-store', // +500000
      style: 'minimal-editorial', // +200000
      delivery: 'tailored', // +300000, +1d
    },
    3 // multiplier 1.4
  );
  // (1500000 + 500000 + 200000 + 300000) * 1.4 = 2500000 * 1.4 = 3500000 (₹35,000)
  assert.equal(priced.unitPackPricePaise, 3500000);
  assert.match(priced.turnaroundDays, /\+1d custom/);
  assert.equal(priced.selectedOptionLabels.scope, 'Multi-Page Storefront Prompt');
});

test('all sample product prices and pack configurations stay between ₹5,000 and ₹50,000', () => {
  const minPaise = 500000;
  const maxPaise = 5000000;

  for (const product of SAMPLE_PRODUCTS) {
    assert.ok(
      product.basePricePaise >= minPaise && product.basePricePaise <= maxPaise,
      `${product.id} base price ${product.basePricePaise} out of ₹5,000–₹50,000 range`
    );

    const minChoiceSum = product.optionGroups.reduce(
      (sum, g) => sum + Math.min(...g.choices.map((c) => c.priceDeltaPaise)),
      0
    );
    const maxChoiceSum = product.optionGroups.reduce(
      (sum, g) => sum + Math.max(...g.choices.map((c) => c.priceDeltaPaise)),
      0
    );

    for (const tier of product.quantityTiers) {
      const lowestPack = Math.round((product.basePricePaise + minChoiceSum) * tier.multiplier);
      const highestPack = Math.round((product.basePricePaise + maxChoiceSum) * tier.multiplier);
      assert.ok(
        lowestPack >= minPaise,
        `${product.id} tier ${tier.quantity} min pack ${lowestPack} < ₹5,000`
      );
      assert.ok(
        highestPack <= maxPaise,
        `${product.id} tier ${tier.quantity} max pack ${highestPack} > ₹50,000`
      );
    }
  }
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
