import type {
  CartItem,
  DeliveryMethod,
  FulfillmentStatus,
  PaymentStatus,
  Product,
  StoreSettings,
} from '../types/print';

export interface CalculatedItemPrice {
  unitPackPricePaise: number;
  selectedOptionLabels: Record<string, string>;
  turnaroundDays: string;
}

export interface CalculatedOrderTotals {
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
}

export function formatInrFromPaise(paise: number): string {
  const safePaise = Number.isFinite(paise) ? Math.round(paise) : 0;
  const rupees = safePaise / 100;
  const hasFraction = safePaise % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(rupees);
}

export function calculateItemPricing(
  product: Product,
  selectedOptions: Record<string, string>,
  quantity: number
): CalculatedItemPrice {
  let optionsDeltaPaise = 0;
  let extraDays = 0;
  const selectedOptionLabels: Record<string, string> = {};

  for (const group of product.optionGroups) {
    const chosenId = selectedOptions[group.id];
    const choice = chosenId
      ? group.choices.find((c) => c.id === chosenId)
      : group.required
        ? undefined
        : group.choices[0];

    if (!choice) {
      throw new Error(`Invalid or missing option for "${group.name}"`);
    }

    optionsDeltaPaise += Math.round(choice.priceDeltaPaise);
    extraDays += choice.turnaroundDaysDelta ?? 0;
    selectedOptionLabels[group.id] = choice.label;
  }

  const tier = product.quantityTiers.find((t) => t.quantity === quantity);
  if (!tier) {
    throw new Error(`Unsupported tier (${quantity}) for "${product.title}"`);
  }

  const singlePackWithOptions = Math.max(0, Math.round(product.basePricePaise + optionsDeltaPaise));
  const unitPackPricePaise = Math.max(100, Math.round(singlePackWithOptions * tier.multiplier));

  const turnaroundDays =
    extraDays > 0 ? `${product.turnaroundDays} (+${extraDays}d custom)` : product.turnaroundDays;

  return {
    unitPackPricePaise,
    selectedOptionLabels,
    turnaroundDays,
  };
}

export function calculateOrderTotals(
  items: Pick<CartItem, 'unitPackPricePaise'>[],
  deliveryMethod: DeliveryMethod,
  settings: Pick<
    StoreSettings,
    'gstPercentage' | 'shippingFeePaise' | 'freeShippingThresholdPaise' | 'pickupEnabled' | 'shippingEnabled'
  >
): CalculatedOrderTotals {
  if (deliveryMethod === 'pickup' && !settings.pickupEnabled) {
    throw new Error('Store pickup is currently disabled.');
  }
  if (deliveryMethod === 'shipping' && !settings.shippingEnabled) {
    throw new Error('Courier shipping is currently disabled.');
  }

  const subtotalPaise = items.reduce(
    (sum, item) => sum + Math.max(0, Math.round(item.unitPackPricePaise)),
    0
  );

  let shippingPaise = 0;
  if (deliveryMethod === 'shipping' && subtotalPaise > 0) {
    shippingPaise =
      subtotalPaise >= settings.freeShippingThresholdPaise
        ? 0
        : Math.max(0, Math.round(settings.shippingFeePaise));
  }

  const taxPaise = 0;
  const totalPaise = subtotalPaise + shippingPaise;

  return {
    subtotalPaise,
    shippingPaise,
    taxPaise,
    totalPaise,
  };
}

export const ALLOWED_ARTWORK_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;

export function validateArtworkFile(
  fileName: string,
  contentType: string,
  sizeBytes: number,
  maxSizeMb: number
): { valid: true } | { valid: false; error: string } {
  if (!fileName || fileName.trim().length === 0) {
    return { valid: false, error: 'File name is missing.' };
  }
  if (!ALLOWED_ARTWORK_MIME_TYPES.includes(contentType as (typeof ALLOWED_ARTWORK_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: 'Unsupported file format. Please upload PDF, PNG, or JPEG reference files only.',
    };
  }
  const maxBytes = Math.max(1, maxSizeMb) * 1024 * 1024;
  if (sizeBytes <= 0) {
    return { valid: false, error: 'File is empty.' };
  }
  if (sizeBytes > maxBytes) {
    return {
      valid: false,
      error: `File exceeds the ${maxSizeMb} MB limit. Please compress your file and retry.`,
    };
  }
  return { valid: true };
}

export const FULFILLMENT_STAGES: FulfillmentStatus[] = [
  'awaiting_payment',
  'artwork_review',
  'printing',
  'ready_for_pickup',
  'shipped',
  'completed',
];

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  awaiting_payment: 'Awaiting Payment',
  artwork_review: 'Brief Review',
  printing: 'Prompt Customization',
  ready_for_pickup: 'Ready to Copy',
  shipped: 'Dispatched',
  completed: 'Prompt Unlocked',
};

export function canTransitionFulfillment(
  current: FulfillmentStatus,
  next: FulfillmentStatus,
  paymentStatus: PaymentStatus,
  deliveryMethod: DeliveryMethod
): { allowed: true } | { allowed: false; reason: string } {
  if (paymentStatus !== 'paid') {
    return {
      allowed: false,
      reason: 'Orders cannot unlock design prompts or advance until payment is verified.',
    };
  }
  if (current === next) {
    return { allowed: true };
  }
  if (next === 'awaiting_payment') {
    return { allowed: false, reason: 'Cannot revert a paid order to awaiting payment.' };
  }
  if (next === 'ready_for_pickup' && deliveryMethod !== 'pickup') {
    return { allowed: false, reason: 'Ready for Pickup applies only to pickup orders.' };
  }
  if (next === 'shipped' && deliveryMethod !== 'shipping') {
    return { allowed: false, reason: 'Shipped applies only to shipping orders.' };
  }

  const allowedTransitions: Record<FulfillmentStatus, FulfillmentStatus[]> = {
    awaiting_payment: ['artwork_review', 'completed'],
    artwork_review: deliveryMethod === 'digital' ? ['printing', 'completed'] : ['printing'],
    printing:
      deliveryMethod === 'digital'
        ? ['completed']
        : [deliveryMethod === 'pickup' ? 'ready_for_pickup' : 'shipped'],
    ready_for_pickup: ['completed'],
    shipped: ['completed'],
    completed: [],
  };

  if (!allowedTransitions[current]?.includes(next)) {
    return {
      allowed: false,
      reason: `Invalid delivery stage transition from "${FULFILLMENT_LABELS[current]}" to "${FULFILLMENT_LABELS[next]}".`,
    };
  }
  return { allowed: true };
}

/**
 * Tailors a master design prompt with the customer's optional brand brief & selected options.
 */
export function buildTailoredOrderPrompt(
  masterPrompt: string,
  selectedOptionLabels: Record<string, string>,
  brandBrief?: string
): string {
  const specsLine = Object.entries(selectedOptionLabels)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');
  const parts = [masterPrompt.trim()];
  if (specsLine) {
    parts.push(`\nSelected Configuration:\n- ${specsLine}`);
  }
  if (brandBrief && brandBrief.trim()) {
    parts.push(`\nCustomer Brand Brief / Text To Include:\n${brandBrief.trim()}`);
  }
  return parts.join('\n');
}
