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
    id: 'prod-enterprise-website-design',
    title: 'Enterprise E-Commerce & Brand Website Design Suite',
    slug: 'enterprise-ecommerce-brand-website-design',
    categoryId: 'cat-website-designs',
    categoryName: 'Website Designs',
    shortDescription:
      'Flagship multi-page e-commerce architecture, design system tokens, PDP configurator & admin dashboard UI.',
    description:
      'Our flagship ₹20,000 enterprise website design package. Purchasing unlocks a comprehensive, production-tested UI/UX architecture prompt covering sticky editorial navigation, high-conversion split hero, category architecture, filterable catalog, product configurator, checkout flow, customer dashboard, and dark/light design tokens.',
    imageUrl: '/images/enterprise-website-design.jpg',
    basePricePaise: 2000000,
    compareAtPricePaise: 2800000,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: false,
    promptToolHint: 'Works with AI App Builders, Figma AI, Claude, ChatGPT, and Gemini',
    promptInstructions:
      '1. Copy the unlocked enterprise website prompt below.\n2. Replace [BRAND_NAME], [PRIMARY_OFFERING], [CURRENCY], and [CONTACT_EMAIL] with your brand details.\n3. Paste into your preferred AI web builder or UI tool to generate the complete multi-page storefront design.',
    designPrompt:
      'Design and architect an enterprise editorial e-commerce website for [BRAND_NAME] specializing in [PRIMARY_OFFERING]. Visual system: Sage Mist neutral canvas (#F2F5F1), Deep Walnut structural anchors (#231710 / #3A261B), Botanical Sage accents (#3D5A4C), and Warm Amber primary CTAs (#F59E0B), paired with Fraunces editorial display serif, Plus Jakarta Sans UI copy, and JetBrains Mono tabular pricing. Deliver: 1) Single-row sticky navigation with wordmark, 5 links, live search, and cart drawer trigger. 2) Split-column hero with editorial headline, dual CTAs, category strip, and interactive product spotlight card. 3) 6-category showcase grid and 3-column 4:3 product catalog with price & category filters. 4) Sticky gallery Product Detail configurator with live tier pricing. 5) Cart, checkout, customer order history, and admin catalog management views.',
    optionGroups: [
      {
        id: 'scope',
        name: 'Architecture Scope',
        type: 'size',
        required: true,
        choices: [
          { id: 'multi-store', label: 'Full Multi-Page Storefront', priceDeltaPaise: 0 },
          { id: 'store-admin', label: 'Storefront + Admin & Analytics', priceDeltaPaise: 500000 },
          { id: 'marketplace', label: 'Multi-Vendor Marketplace UI', priceDeltaPaise: 1000000 },
        ],
      },
      {
        id: 'style',
        name: 'Aesthetic System',
        type: 'finish',
        required: true,
        choices: [
          { id: 'sage-walnut', label: 'Walnut, Sage & Amber Editorial', priceDeltaPaise: 0 },
          { id: 'monochrome-luxe', label: 'Monochrome Luxury Minimal', priceDeltaPaise: 250000 },
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
            label: 'Instant + Studio-Tailored Brief',
            priceDeltaPaise: 300000,
            turnaroundDaysDelta: 1,
          },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: 'Single Brand License', multiplier: 1 },
      { quantity: 3, label: '3 Concept Variations', multiplier: 1.35, discountLabel: 'Save 55%' },
      { quantity: 5, label: 'Agency Commercial Pack', multiplier: 1.6, discountLabel: 'Save 68%' },
    ],
  },
  {
    id: 'prod-ecommerce-website-design',
    title: 'Modern Business & Portfolio Website Design Prompt',
    slug: 'modern-business-ecommerce-website-design',
    categoryId: 'cat-website-designs',
    categoryName: 'Website Designs',
    shortDescription:
      'Clean responsive business website layout, color tokens, typography scale & lead-capture sections.',
    description:
      'A sharp ₹5,000 business website design package built for studios, clinics, consultants, and retail brands. Purchasing unlocks a production-ready website UI/UX prompt covering responsive navigation, two-column hero with featured spotlight, service showcase grid, FAQ accordion, and structured contact footer.',
    imageUrl: '/images/website-designs.jpg',
    basePricePaise: 500000,
    compareAtPricePaise: 750000,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: false,
    promptToolHint: 'Works with AI App Builders, ChatGPT, Claude, Gemini, and Figma AI',
    promptInstructions:
      '1. Copy the unlocked prompt below.\n2. Replace [BRAND_NAME], [PRIMARY_OFFERING], and [CONTACT_EMAIL] with your brand details.\n3. Paste into your preferred AI website builder or UI design tool to generate the complete responsive website design.',
    designPrompt:
      'Design and build a responsive editorial business website for [BRAND_NAME] specializing in [PRIMARY_OFFERING]. Use a grounded Sage Green (#F2F5F1 canvas, #3D5A4C accents), deep Walnut Brown (#231710 / #3A261B headers & anchors), and warm Amber Glow (#F59E0B primary CTAs) palette. Structure: 1) Sticky top navbar with brand mark, primary links, and primary CTA. 2) Two-column hero featuring bold Fraunces display typography, dual CTAs, and an interactive Featured Spotlight card. 3) Service & category showcase grid, 4:3 portfolio cards, interactive FAQ accordion, and a structured 4-column contact footer.',
    optionGroups: [
      {
        id: 'scope',
        name: 'Website Type',
        type: 'size',
        required: true,
        choices: [
          { id: 'landing', label: 'Single Landing Page Prompt', priceDeltaPaise: 0 },
          { id: 'multi-store', label: '5-Page Business Website Prompt', priceDeltaPaise: 250000 },
          { id: 'full-saas', label: 'Booking & Lead Portal Prompt', priceDeltaPaise: 500000 },
        ],
      },
      {
        id: 'style',
        name: 'Visual Aesthetic',
        type: 'finish',
        required: true,
        choices: [
          { id: 'sage-walnut', label: 'Sage Green, Walnut & Amber Glow', priceDeltaPaise: 0 },
          { id: 'minimal-editorial', label: 'Minimalist Luxury Editorial', priceDeltaPaise: 100000 },
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
            priceDeltaPaise: 150000,
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
  {
    id: 'prod-luxury-business-card-suite',
    title: 'Executive Gold-Foil & Corporate Identity Card Suite',
    slug: 'executive-gold-foil-business-card-suite',
    categoryId: 'cat-business-cards',
    categoryName: 'Business Card Designs',
    shortDescription:
      'Double-sided visiting card, embossed monogram crest, QR contact back & print-ready bleed layout.',
    description:
      'Crafted for founders, law firms, architects, and boutique brands at ₹5,000. Unlocks front-and-back visiting card art direction with matte textured stock styling, precision gold-foil monogram hierarchy, balanced typographic spacing, and optional corporate letterhead + envelope coordination.',
    imageUrl: '/images/business-cards.jpg',
    basePricePaise: 500000,
    compareAtPricePaise: 700000,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: false,
    promptToolHint: 'Works with Midjourney, Ideogram, Adobe Firefly, Illustrator AI, and Canva',
    promptInstructions:
      '1. Copy the unlocked visiting card design prompt.\n2. Insert [FULL_NAME], [ROLE_TITLE], [COMPANY_NAME], [PHONE], and [WEBSITE].\n3. Generate front and back print-ready compositions at 3.5x2 inch aspect ratio with 3mm bleed.',
    designPrompt:
      'Create a luxury double-sided corporate business card design (3.5 x 2 inches, 300 DPI CMYK print layout) for [COMPANY_NAME]. Front side: deep espresso walnut matte card stock (#231710) with centered hot-stamped brushed gold foil geometric monogram and refined serif wordmark. Back side: warm ivory cotton paper (#F7F6F2) with left-aligned typographic grid displaying [FULL_NAME], [ROLE_TITLE], [PHONE], [EMAIL], and [WEBSITE] alongside a minimalist framed QR code in the bottom-right corner. Clean margins, zero visual clutter, studio tactile presentation.',
    optionGroups: [
      {
        id: 'format',
        name: 'Card Format',
        type: 'size',
        required: true,
        choices: [
          { id: 'standard-dual', label: 'Double-Sided Horizontal (3.5×2 in)', priceDeltaPaise: 0 },
          { id: 'square-qr', label: 'Square Boutique + QR Back', priceDeltaPaise: 100000 },
          { id: 'exec-stationery', label: 'Card + Letterhead & Envelope Set', priceDeltaPaise: 350000 },
        ],
      },
      {
        id: 'finish',
        name: 'Finish Aesthetic',
        type: 'finish',
        required: true,
        choices: [
          { id: 'walnut-gold', label: 'Matte Walnut & Brushed Gold Foil', priceDeltaPaise: 0 },
          { id: 'cotton-letterpress', label: 'Ivory Cotton & Debossed Ink', priceDeltaPaise: 100000 },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: 'Single Executive Pack', multiplier: 1 },
      { quantity: 3, label: '3 Style Variations', multiplier: 1.35, discountLabel: 'Save 55%' },
      { quantity: 5, label: 'Team & Agency Pack', multiplier: 1.65, discountLabel: 'Save 67%' },
    ],
  },
  {
    id: 'prod-corporate-brochure-flyer-pack',
    title: 'Corporate Tri-Fold Brochure & Product Catalogue Design',
    slug: 'corporate-trifold-brochure-catalogue-design',
    categoryId: 'cat-flyers-brochures',
    categoryName: 'Flyer & Brochure Designs',
    shortDescription:
      'Editorial tri-fold & multi-page company profile layouts with structured pricing tables and photo grids.',
    description:
      'Structured commercial brochure and catalogue design system priced at ₹8,000. Ideal for manufacturers, real-estate developers, hospitality venues, and B2B service providers needing crisp 6-panel tri-folds or multi-page lookbooks ready for offset printing or digital PDF sharing.',
    imageUrl: '/images/flyers-brochures.jpg',
    basePricePaise: 800000,
    compareAtPricePaise: 1100000,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: false,
    promptToolHint: 'Works with InDesign AI, Figma, Canva Magic Design, ChatGPT, and Gemini',
    promptInstructions:
      '1. Copy the unlocked brochure layout prompt.\n2. Replace [COMPANY_NAME], [SERVICES_LIST], and [OFFER_HIGHLIGHTS].\n3. Use the panel-by-panel wireframe breakdown to lay out your print or interactive PDF brochure.',
    designPrompt:
      'Design a 6-panel A4 tri-fold corporate brochure and matching promotional flyer for [COMPANY_NAME]. Use an editorial Swiss grid with generous whitespace, deep charcoal-walnut headlines (#2B1D14), sage structural callouts (#3D5A4C), and amber accent dividers (#F59E0B). Cover panel: full-bleed architectural hero image with measured dark scrim and balanced serif title. Inside spread: 3 structured columns covering Company Overview, Core Capabilities ([SERVICES_LIST]), and transparent INR specification tables with tabular numerals. Back panel: location details, helpline, and scannable QR code.',
    optionGroups: [
      {
        id: 'layout',
        name: 'Layout Format',
        type: 'size',
        required: true,
        choices: [
          { id: 'trifold-a4', label: 'Tri-Fold A4 Brochure + A5 Flyer', priceDeltaPaise: 0 },
          { id: 'profile-12p', label: '12-Page Company Profile Layout', priceDeltaPaise: 400000 },
          { id: 'catalogue-24p', label: '24-Page Product Lookbook & Rate Card', priceDeltaPaise: 700000 },
        ],
      },
      {
        id: 'style',
        name: 'Editorial Direction',
        type: 'finish',
        required: true,
        choices: [
          { id: 'corporate-grid', label: 'Modern Swiss Corporate Grid', priceDeltaPaise: 0 },
          { id: 'magazine-spread', label: 'Luxury Editorial Magazine Spread', priceDeltaPaise: 150000 },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: 'Standard Brand License', multiplier: 1 },
      { quantity: 3, label: '3 Campaign Variants', multiplier: 1.4, discountLabel: 'Save 53%' },
      { quantity: 5, label: 'Agency Commercial Pack', multiplier: 1.7, discountLabel: 'Save 66%' },
    ],
  },
  {
    id: 'prod-exhibition-banner-signage-suite',
    title: 'Exhibition Booth, Roll-Up Standee & Storefront Signage Suite',
    slug: 'exhibition-banner-standee-signage-suite',
    categoryId: 'cat-banners-signage',
    categoryName: 'Banner & Signage Designs',
    shortDescription:
      'High-visibility 6×3 ft standees, exhibition backdrops, retail fascia signboards & directional signage.',
    description:
      'Command attention at trade shows, retail launches, and storefronts with our ₹12,000 large-format banner and signage design suite. Delivers exact distance-legibility typography scales, focal hierarchy, high-contrast color framing, and multi-aspect layout specifications.',
    imageUrl: '/images/banners-signage.jpg',
    basePricePaise: 1200000,
    compareAtPricePaise: 1650000,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: false,
    promptToolHint: 'Works with Midjourney, Adobe Firefly, Illustrator AI, and Figma',
    promptInstructions:
      '1. Copy the unlocked large-format signage prompt.\n2. Replace [BRAND_NAME], [HEADLINE_MESSAGE], and [BOOTH_OR_STORE_LOCATION].\n3. Apply the specified viewing-distance type hierarchy for crisp large-format printing.',
    designPrompt:
      'Design a cohesive large-format exhibition and storefront signage kit for [BRAND_NAME] featuring: 1) Vertical 6x3 ft roll-up standee with top eye-level brand crest, bold 3-word headline ([HEADLINE_MESSAGE]) readable from 15 feet, crisp product photography centerpiece, and clean contact strip at waist height. 2) 10x8 ft trade-show backdrop wall with dark walnut-to-forest gradient, subtle architectural linework, and warm amber lighting accents. 3) Illuminated storefront fascia signboard design with high-contrast serif wordmark and generous negative space.',
    optionGroups: [
      {
        id: 'coverage',
        name: 'Signage Coverage',
        type: 'size',
        required: true,
        choices: [
          { id: 'standee-fascia', label: 'Roll-Up Standee + Fascia Board', priceDeltaPaise: 0 },
          { id: 'trade-booth', label: 'Full Trade-Show Booth Backdrop', priceDeltaPaise: 500000 },
          { id: 'retail-kit', label: 'Complete Retail Store Signage Kit', priceDeltaPaise: 800000 },
        ],
      },
      {
        id: 'aesthetic',
        name: 'Visual Style',
        type: 'finish',
        required: true,
        choices: [
          { id: 'architectural', label: 'High-Contrast Architectural', priceDeltaPaise: 0 },
          { id: 'heritage-glow', label: 'Warm Illuminated Heritage', priceDeltaPaise: 150000 },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: 'Single Venue License', multiplier: 1 },
      { quantity: 3, label: '3 Size Adaptations', multiplier: 1.35, discountLabel: 'Save 55%' },
      { quantity: 5, label: 'Multi-Branch Franchise Pack', multiplier: 1.6, discountLabel: 'Save 68%' },
    ],
  },
  {
    id: 'prod-packaging-label-design-system',
    title: 'Artisanal Packaging, Die-Cut Sticker & Bottle Label System',
    slug: 'artisanal-packaging-sticker-label-system',
    categoryId: 'cat-stickers-labels',
    categoryName: 'Sticker & Label Designs',
    shortDescription:
      'Cohesive D2C bottle labels, folding carton dielines, metallic tamper seals & die-cut sticker sheets.',
    description:
      'Built for D2C skincare, organic foods, coffee roasters, and gourmet gifting brands at ₹15,000. Unlocks a complete packaging and label design system with front-label hierarchy, nutrition/ingredient back-panel grids, metallic foil seal badges, and retail box styling.',
    imageUrl: '/images/packaging-label-system.jpg',
    basePricePaise: 1500000,
    compareAtPricePaise: 2000000,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: false,
    promptToolHint: 'Works with Midjourney, Adobe Firefly, Illustrator AI, Figma, and Packdora',
    promptInstructions:
      '1. Copy the unlocked packaging & label system prompt.\n2. Fill in [BRAND_NAME], [PRODUCT_SKU], [NET_WEIGHT], and [KEY_INGREDIENTS].\n3. Use the included material finish notes (matte uncoated stock + gold foil) when generating mockups or print proofs.',
    designPrompt:
      'Create a minimalist luxury D2C product packaging and label system for [BRAND_NAME] ([PRODUCT_SKU], [NET_WEIGHT]). Include: 1) Amber glass bottle front wrap label on cream cotton textured paper with brushed gold-foil crest, balanced serif product title, botanical subtitle, and fine hairline border. 2) Rigid matte sage-green folding carton box with debossed monogram on the top flap and clean ingredient/barcode panel on the rear. 3) Matching 40mm circular gold-foil tamper-seal sticker roll designed for unboxing elegance.',
    optionGroups: [
      {
        id: 'sku-scope',
        name: 'SKU Coverage',
        type: 'size',
        required: true,
        choices: [
          { id: 'core-3', label: 'Core 3-SKU Label Suite', priceDeltaPaise: 0 },
          { id: 'line-6', label: '6-SKU Full Product Line', priceDeltaPaise: 500000 },
          { id: 'box-seals', label: 'Box Dieline + Foil Seals + Labels', priceDeltaPaise: 800000 },
        ],
      },
      {
        id: 'finish',
        name: 'Finish Direction',
        type: 'finish',
        required: true,
        choices: [
          { id: 'botanical-foil', label: 'Botanical Matte & Embossed Foil', priceDeltaPaise: 0 },
          { id: 'apothecary', label: 'Minimal Apothecary Glass Style', priceDeltaPaise: 200000 },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: 'Single Brand Line', multiplier: 1 },
      { quantity: 3, label: '3 Variant Colorways', multiplier: 1.3, discountLabel: 'Save 57%' },
      { quantity: 5, label: 'D2C Agency Pack', multiplier: 1.6, discountLabel: 'Save 68%' },
    ],
  },
  {
    id: 'prod-royal-wedding-invitation-suite',
    title: 'Royal Heritage Wedding Invitation & Multi-Event Card Suite',
    slug: 'royal-heritage-wedding-invitation-suite',
    categoryId: 'cat-invitations',
    categoryName: 'Invitation & Card Designs',
    shortDescription:
      'Bespoke wedding card suite with ceremony itinerary inserts, RSVP card, monogram crest & digital WhatsApp invite.',
    description:
      'Celebrate milestone occasions with our ₹10,000 bespoke invitation design suite. Covers the main ceremony invitation, sangeet/reception inserts, custom couple monogram crest, RSVP card, envelope liner artwork, and mobile-optimized digital invitation format.',
    imageUrl: '/images/invitations-cards.jpg',
    basePricePaise: 1000000,
    compareAtPricePaise: 1400000,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: false,
    published: true,
    isSampleData: false,
    promptToolHint: 'Works with Midjourney, Ideogram, Canva, Adobe Firefly, and Figma',
    promptInstructions:
      '1. Copy the unlocked wedding suite prompt.\n2. Replace [COUPLE_NAMES], [CEREMONY_DATES], [VENUE_CITY], and [FAMILY_HOST_NAMES].\n3. Generate matching print cards (5x7 in) and vertical 9:16 digital invites.',
    designPrompt:
      'Design a royal Indian heritage wedding invitation suite for [COUPLE_NAMES] taking place on [CEREMONY_DATES] at [VENUE_CITY]. Aesthetic: fine ivory handmade cotton paper framed by delicate temple-arch gold-foil border motifs, deep emerald-sage accents (#2E4035), and custom intertwined couple initials monogram at top center. Include coordinated layouts for: 1) Main Muhurtham/Ceremony Invitation (5x7 in). 2) Reception & Sangeet Insert Card with graceful serif calligraphy hierarchy. 3) RSVP & Venue Map Card. 4) Matching 9:16 mobile WhatsApp digital invite screen.',
    optionGroups: [
      {
        id: 'suite-size',
        name: 'Invitation Suite Size',
        type: 'size',
        required: true,
        choices: [
          { id: 'core-3card', label: 'Main Invite + RSVP + Save-the-Date', priceDeltaPaise: 0 },
          { id: 'box-5card', label: '5-Card Ceremony Box Suite', priceDeltaPaise: 400000 },
          { id: 'print-digital', label: 'Full Print Suite + Digital Invite', priceDeltaPaise: 700000 },
        ],
      },
      {
        id: 'art-direction',
        name: 'Art Direction',
        type: 'finish',
        required: true,
        choices: [
          { id: 'temple-gold', label: 'South Indian Temple Gold & Emerald', priceDeltaPaise: 0 },
          { id: 'floral-foil', label: 'Minimal Floral Watercolor & Foil', priceDeltaPaise: 150000 },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: 'Personal Event License', multiplier: 1 },
      { quantity: 3, label: '3 Theme Drafts', multiplier: 1.35, discountLabel: 'Save 55%' },
      { quantity: 5, label: 'Event Planner Studio Pack', multiplier: 1.6, discountLabel: 'Save 68%' },
    ],
  },
  {
    id: 'prod-complete-brand-identity-package',
    title: 'Complete 360° Brand Identity, Website & Stationery Design Kit',
    slug: 'complete-360-brand-identity-website-kit',
    categoryId: 'cat-website-designs',
    categoryName: 'Website Designs',
    shortDescription:
      'All-in-one ₹20,000 master brand kit: website UI, logo system, visiting cards, letterheads & brand book.',
    description:
      'Our all-inclusive ₹20,000 complete brand launch kit designed for ambitious new companies and rebrands. Unlocks synchronized design prompts across digital and print touchpoints—ensuring your website, logo mark, typography book, business cards, letterheads, and packaging speak one unmistakable visual language.',
    imageUrl: '/images/complete-brand-kit.jpg',
    basePricePaise: 2000000,
    compareAtPricePaise: 3000000,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: false,
    published: true,
    isSampleData: false,
    promptToolHint: 'Works with AI App Builders, Figma AI, Midjourney, Claude, and Gemini',
    promptInstructions:
      '1. Copy the unlocked 360° Brand Identity master bundle.\n2. Replace [BRAND_NAME], [INDUSTRY], [BRAND_VALUES], and [TARGET_AUDIENCE].\n3. Run Section A for Logo & Guidelines, Section B for Website UI, and Section C for Print Collateral.',
    designPrompt:
      'Create a unified 360-degree brand identity system for [BRAND_NAME] in [INDUSTRY]. Part A (Identity & Brand Book): primary architectural wordmark, geometric monogram crest, 60-30-10 color palette (Warm Stone, Deep Walnut #231710, Sage #3D5A4C, Brushed Gold #F59E0B), Fraunces + Plus Jakarta Sans typography specimen, and usage rules. Part B (Flagship Website): responsive desktop and mobile editorial storefront with clean navigation, hero showcase, service/product catalog, and inquiry/checkout flow. Part C (Print Collateral): double-sided foil business card, executive A4 letterhead, wax-sealed envelope, and presentation folder—all sharing identical visual tokens.',
    optionGroups: [
      {
        id: 'depth',
        name: 'Deliverable Depth',
        type: 'size',
        required: true,
        choices: [
          { id: 'core-360', label: 'Website + Logo + Card + Letterhead', priceDeltaPaise: 0 },
          { id: 'brand-packaging', label: 'Full Brand Book + Social & Packaging', priceDeltaPaise: 500000 },
          { id: 'enterprise-deck', label: 'Enterprise System + Investor Pitch Deck', priceDeltaPaise: 1000000 },
        ],
      },
      {
        id: 'delivery',
        name: 'Delivery Mode',
        type: 'custom',
        required: true,
        choices: [
          { id: 'instant', label: 'Instant Master Prompt Bundle', priceDeltaPaise: 0 },
          {
            id: 'tailored',
            label: 'Instant + Dedicated Studio Tailoring',
            priceDeltaPaise: 400000,
            turnaroundDaysDelta: 2,
          },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: 'Single Enterprise Brand', multiplier: 1 },
      { quantity: 3, label: '3 Brand Directions', multiplier: 1.35, discountLabel: 'Save 55%' },
      { quantity: 5, label: 'Agency Retainer Pack', multiplier: 1.6, discountLabel: 'Save 68%' },
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
