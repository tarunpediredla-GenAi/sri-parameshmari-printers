export interface PrintOptionChoice {
  id: string;
  label: string;
  priceDeltaPaise: number;
  turnaroundDaysDelta?: number;
}

export interface PrintOptionGroup {
  id: string;
  name: string;
  type: 'size' | 'paper' | 'finish' | 'sides' | 'custom';
  required: boolean;
  choices: PrintOptionChoice[];
}

export interface QuantityTier {
  quantity: number;
  label: string;
  multiplier: number;
  discountLabel?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  shortDescription: string;
  description: string;
  imageUrl: string;
  basePricePaise: number;
  compareAtPricePaise?: number;
  turnaroundDays: string;
  artworkRequired: boolean;
  featured: boolean;
  published: boolean;
  optionGroups: PrintOptionGroup[];
  quantityTiers: QuantityTier[];
  /** Stored securely on server/Firestore; stripped from public catalog responses until paid */
  designPrompt?: string;
  promptInstructions?: string;
  promptToolHint?: string;
  hasPromptDeliverable?: boolean;
  isSampleData?: boolean;
  updatedAt?: string;
}

export interface ArtworkAttachment {
  artworkId: string;
  fileName: string;
  contentType: 'application/pdf' | 'image/png' | 'image/jpeg';
  sizeBytes: number;
  status: 'uploaded' | 'approved' | 'revision_requested';
  reviewNote?: string;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  title: string;
  imageUrl: string;
  selectedOptions: Record<string, string>;
  selectedOptionLabels: Record<string, string>;
  quantity: number;
  unitPackPricePaise: number;
  turnaroundDays: string;
  artworkRequired: boolean;
  brandBrief?: string;
  artwork?: ArtworkAttachment | null;
}

export interface SavedAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  phone?: string;
  companyName?: string;
  gstin?: string;
  addresses: SavedAddress[];
  wishlistProductIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type FulfillmentStatus =
  | 'awaiting_payment'
  | 'artwork_review'
  | 'printing'
  | 'ready_for_pickup'
  | 'shipped'
  | 'completed';

export type DeliveryMethod = 'digital' | 'shipping' | 'pickup';

export interface OrderItemSnapshot {
  cartItemId: string;
  productId: string;
  title: string;
  imageUrl: string;
  selectedOptions: Record<string, string>;
  selectedOptionLabels: Record<string, string>;
  quantity: number;
  lineTotalPaise: number;
  turnaroundDays: string;
  artworkRequired: boolean;
  brandBrief?: string;
  artwork?: ArtworkAttachment | null;
  /** Revealed strictly after paymentStatus === 'paid'; can also be customized by Admin */
  unlockedPrompt?: string;
  promptInstructions?: string;
  promptToolHint?: string;
  promptUpdatedAt?: string;
}

export interface FulfillmentEvent {
  status: FulfillmentStatus;
  note: string;
  updatedBy: string;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod;
  shippingAddress?: SavedAddress | null;
  items: OrderItemSnapshot[];
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: 'INR';
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentFailureReason?: string;
  fulfillmentHistory: FulfillmentEvent[];
  createdAt: string;
  updatedAt: string;
}

export type QuoteStatus = 'submitted' | 'reviewing' | 'quoted' | 'accepted' | 'declined';

export interface QuoteRequest {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  productType: string;
  quantity: number;
  dimensions?: string;
  paperAndFinish?: string;
  notes?: string;
  artworkId?: string;
  artworkFileName?: string;
  status: QuoteStatus;
  quotedPricePaise?: number;
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorePolicyContent {
  about: string;
  privacy: string;
  terms: string;
  refund: string;
  shipping: string;
}

export interface StoreSettings {
  id: string;
  businessName: string;
  tagline: string;
  proprietorOrEntity: string;
  address: string;
  email: string;
  phone: string;
  businessHours: string;
  gstPercentage: number;
  shippingFeePaise: number;
  freeShippingThresholdPaise: number;
  pickupEnabled: boolean;
  shippingEnabled: boolean;
  maxArtworkSizeMb: number;
  policies: StorePolicyContent;
  updatedAt?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
