import type { Category, FaqItem, Product, StoreSettings } from '../types/print';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  id: 'storefront',
  businessName: 'Sri Parameshmari Printers',
  tagline: 'Digital Design & Prompt Studio · Websites, Branding & Event Designs',
  proprietorOrEntity: '[Configure Proprietor / Registered Studio Entity in Admin]',
  address: '[Configure Studio Address, City, State & PIN Code in Admin]',
  email: '[Configure Support Email in Admin]',
  phone: '[Configure Studio Helpline Number in Admin]',
  businessHours: 'Monday – Saturday, 9:30 AM – 7:30 PM IST (24/7 Instant Prompt Unlock)',
  gstPercentage: 0,
  shippingFeePaise: 0,
  freeShippingThresholdPaise: 0,
  pickupEnabled: false,
  shippingEnabled: false,
  maxArtworkSizeMb: 25,
  policies: {
    about:
      'Sri Parameshmari Printers is a digital design & prompt studio specializing in Websites, Business Cards, Flyers & Brochures, Banners & Signage, Stickers & Labels, and Invitations & Cards. Every purchase unlocks a production-tested design prompt you can immediately copy to generate or build your finished design.',
    privacy:
      'Customer contact details, brand briefs, and uploaded reference logos are stored securely in private authenticated storage and used strictly for order fulfillment and custom prompt tailoring.',
    terms:
      'All digital design prompt packages unlock immediately upon verified Razorpay payment. Commercial and agency license tiers permit client and commercial project usage according to the selected pack.',
    refund:
      'Because digital design prompts are unlocked immediately upon verified payment, orders are non-refundable once the prompt has been revealed. If you need assistance customizing a prompt for your brand, contact our desk with your Order ID.',
    shipping:
      'Designs-only storefront: all products are delivered digitally inside your Order Confirmation page and Account Dashboard immediately after payment verification at ₹0 shipping cost.',
  },
};

export const SAMPLE_CATEGORIES: Category[] = [
  {
    id: 'cat-website-designs',
    name: 'Website Designs',
    slug: 'website-designs',
    description: 'Complete storefront, business, portfolio & landing page UI design prompts.',
    imageUrl: '/images/website-designs.jpg',
    sortOrder: 1,
    active: true,
  },
  {
    id: 'cat-business-cards',
    name: 'Business Card Designs',
    slug: 'business-card-designs',
    description: 'Luxury minimalist, gold-foil style & corporate visiting card design prompts.',
    imageUrl: '/images/business-cards.jpg',
    sortOrder: 2,
    active: true,
  },
  {
    id: 'cat-flyers-brochures',
    name: 'Flyer & Brochure Designs',
    slug: 'flyer-brochure-designs',
    description: 'High-converting bi-fold, tri-fold brochures and event flyer layout prompts.',
    imageUrl: '/images/flyers-brochures.jpg',
    sortOrder: 3,
    active: true,
  },
  {
    id: 'cat-banners-signage',
    name: 'Banner & Signage Designs',
    slug: 'banner-signage-designs',
    description: 'Roll-up standees, storefront hoardings, flex & exhibition backdrop prompts.',
    imageUrl: '/images/banners-signage.jpg',
    sortOrder: 4,
    active: true,
  },
  {
    id: 'cat-stickers-labels',
    name: 'Sticker & Label Designs',
    slug: 'sticker-label-designs',
    description: 'Die-cut vinyl stickers, bottle packaging labels & metallic seal prompts.',
    imageUrl: '/images/stickers-labels.jpg',
    sortOrder: 5,
    active: true,
  },
  {
    id: 'cat-invitations',
    name: 'Invitation & Card Designs',
    slug: 'invitation-card-designs',
    description: 'Royal wedding suites, festive greetings, RSVP & ceremony card design prompts.',
    imageUrl: '/images/invitations-cards.jpg',
    sortOrder: 6,
    active: true,
  },
];

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prod-ecommerce-website-design',
    title: 'Modern Business & E-Commerce Website Design Prompt',
    slug: 'modern-business-ecommerce-website-design',
    categoryId: 'cat-website-designs',
    categoryName: 'Website Designs',
    shortDescription:
      'Sample Design · Full responsive storefront layout, color tokens, typography & component prompt.',
    description:
      'Sample digital design package. Purchasing unlocks a detailed, production-ready website UI/UX prompt covering responsive navigation, two-column hero with featured spotlight, product grid, checkout architecture, and color tokens so you can generate the exact website design in seconds.',
    imageUrl: '/images/website-designs.jpg',
    basePricePaise: 49900,
    compareAtPricePaise: 99900,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: true,
    promptToolHint: 'Works with AI App Builders, ChatGPT, Claude, Gemini, and Figma AI',
    promptInstructions:
      '1. Copy the unlocked prompt below.\n2. Replace [BRAND_NAME], [PRIMARY_OFFERING], and [CONTACT_EMAIL] with your brand details.\n3. Paste into your preferred AI website builder or UI design tool to generate the complete responsive website design.',
    designPrompt:
      'Design and build a responsive editorial e-commerce website for [BRAND_NAME] specializing in [PRIMARY_OFFERING]. Use a grounded Sage Green (#F2F5F1 canvas, #3D5A4C accents), deep Walnut Brown (#231710 / #3A261B headers & anchors), and warm Amber Glow (#F59E0B primary CTAs) palette. Structure: 1) Sticky top navbar with brand mark, primary links, live search bar, and cart count badge. 2) Two-column hero on deep walnut-to-sage gradient featuring bold display typography, two CTA buttons, quick category chips, and an interactive Featured Spotlight card on the right. 3) Category showcase grid, filterable Shop grid with 4:3 cards, Product Configurator view, Cart & Checkout flow, and FAQ accordion + structured 4-column footer.',
    optionGroups: [
      {
        id: 'scope',
        name: 'Website Type',
        type: 'size',
        required: true,
        choices: [
          { id: 'landing', label: 'Single Landing Page Prompt', priceDeltaPaise: 0 },
          { id: 'multi-store', label: 'Multi-Page Storefront Prompt', priceDeltaPaise: 20000 },
          { id: 'full-saas', label: 'Storefront + Admin Dashboard Prompt', priceDeltaPaise: 40000 },
        ],
      },
      {
        id: 'style',
        name: 'Visual Aesthetic',
        type: 'finish',
        required: true,
        choices: [
          { id: 'sage-walnut', label: 'Sage Green, Walnut & Amber Glow', priceDeltaPaise: 0 },
          { id: 'minimal-editorial', label: 'Minimalist Luxury Editorial', priceDeltaPaise: 10000 },
        ],
      },
      {
        id: 'delivery',
        name: 'Prompt Delivery Mode',
        type: 'custom',
        required: true,
        choices: [
          { id: 'instant', label: 'Instant Master Prompt Unlock', priceDeltaPaise: 0 },
          {
            id: 'tailored',
            label: 'Instant + Studio-Tailored Prompt',
            priceDeltaPaise: 20000,
            turnaroundDaysDelta: 1,
          },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: 'Personal License', multiplier: 1 },
      { quantity: 3, label: '3 Prompt Variations', multiplier: 1.4, discountLabel: 'Save 53%' },
      { quantity: 5, label: 'Agency Commercial Pack', multiplier: 1.7, discountLabel: 'Save 66%' },
    ],
  },
];

export const DEFAULT_FAQS: FaqItem[] = [
  {
    id: 'faq-how-prompt-works',
    question: 'How do I get my design after purchasing?',
    answer:
      'Immediately after your Razorpay payment is verified, your order unlocks the complete, studio-tested Design Prompt right on your Order Confirmation page and in your Account Dashboard. Copy the prompt with one click, fill in your brand placeholders (or use the version tailored with your brand brief), and paste it into your AI design or website tool to generate your finished design.',
  },
  {
    id: 'faq-designs-only',
    question: 'Do you ship physical printed items or only digital designs & prompts?',
    answer:
      'We sell Digital Designs & Prompt Packages ONLY — covering Website Designs, Business Card Designs, Flyer & Brochure Designs, Banner & Signage Designs, Sticker & Label Designs, and Invitation & Card Designs. There are zero shipping fees and zero courier delays.',
  },
  {
    id: 'faq-custom-tailoring',
    question: 'Can the studio customize a prompt specifically for my business name and brand colors?',
    answer:
      'Yes! Enter your business name, tagline, or color notes in the Brand Brief box on any design page before checkout (or submit a Custom Design Quote). Our team can also update and deliver a personalized prompt directly into your paid order.',
  },
  {
    id: 'faq-payment',
    question: 'Which payment methods are supported?',
    answer:
      'All payments are processed securely in Indian Rupees (INR) via Razorpay Standard Checkout (UPI, credit/debit cards, net banking, and wallets). Prompts remain locked until Razorpay verifies payment.',
  },
  {
    id: 'faq-privacy',
    question: 'Are my brand briefs, reference logos, and unlocked prompts kept private?',
    answer:
      'Yes. Unlocked prompts are never exposed publicly in the catalog and are served strictly to the authenticated purchaser and store admins after verified payment.',
  },
];
