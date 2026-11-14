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
  gstPercentage: 18,
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
    basePricePaise: 149900,
    compareAtPricePaise: 249900,
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
          { id: 'multi-store', label: 'Multi-Page Storefront Prompt', priceDeltaPaise: 50000 },
          { id: 'full-saas', label: 'Storefront + Admin Dashboard Prompt', priceDeltaPaise: 90000 },
        ],
      },
      {
        id: 'style',
        name: 'Visual Aesthetic',
        type: 'finish',
        required: true,
        choices: [
          { id: 'sage-walnut', label: 'Sage Green, Walnut & Amber Glow', priceDeltaPaise: 0 },
          { id: 'minimal-editorial', label: 'Minimalist Luxury Editorial', priceDeltaPaise: 20000 },
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
            priceDeltaPaise: 40000,
            turnaroundDaysDelta: 1,
          },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: 'Personal License', multiplier: 1 },
      { quantity: 3, label: '3 Prompt Variations', multiplier: 1.75, discountLabel: 'Save 42%' },
      { quantity: 5, label: 'Agency Commercial Pack', multiplier: 2.5, discountLabel: 'Save 50%' },
    ],
  },
  {
    id: 'prod-gold-foil-business-cards',
    title: 'Royal Matte & Foil Business Card Design Prompt',
    slug: 'royal-matte-foil-business-card-design',
    categoryId: 'cat-business-cards',
    categoryName: 'Business Card Designs',
    shortDescription:
      'Sample Design · Executive front-and-back visiting card layout prompt with metallic accents.',
    description:
      'Sample digital design package for business cards. Unlocks a precision-engineered graphic design prompt for front & back visiting card layouts (90×54 mm / 3.5×2 in ratio) with crisp typographic hierarchy, QR placement, and luxury matte-and-foil mockup presentation.',
    imageUrl: '/images/business-cards.jpg',
    basePricePaise: 49900,
    compareAtPricePaise: 79900,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: true,
    promptToolHint: 'Works with Ideogram, Midjourney, ChatGPT Image Gen, Canva Magic & Gemini',
    promptInstructions:
      '1. Copy the unlocked prompt.\n2. Fill in [FULL_NAME], [JOB_TITLE], [COMPANY_NAME], [PHONE], and [WEBSITE].\n3. Run the prompt at 16:9 or 3:2 landscape ratio to generate print-ready front & back business card artwork concepts.',
    designPrompt:
      'Create an ultra-clean luxury double-sided business card graphic design (3.5 x 2 inch proportion, 300 DPI editorial studio layout) for [COMPANY_NAME]. Front side: deep matte charcoal-walnut background (#231710) with centered minimalist geometric monogram emblem and brand name in warm brushed gold foil (#F59E0B), refined serif + clean sans-serif pairing. Back side: warm ivory-sage matte surface (#F2F5F1) displaying [FULL_NAME], [JOB_TITLE], [PHONE], [EMAIL], [WEBSITE], and a crisp dark minimalist QR frame aligned to a balanced 2-column grid with generous margins and zero clutter.',
    optionGroups: [
      {
        id: 'format',
        name: 'Card Orientation',
        type: 'size',
        required: true,
        choices: [
          { id: 'landscape', label: 'Horizontal (90 × 54 mm)', priceDeltaPaise: 0 },
          { id: 'vertical', label: 'Vertical Portrait (54 × 90 mm)', priceDeltaPaise: 5000 },
          { id: 'square', label: 'Modern Square (65 × 65 mm)', priceDeltaPaise: 10000 },
        ],
      },
      {
        id: 'sides',
        name: 'Layout Coverage',
        type: 'sides',
        required: true,
        choices: [
          { id: 'double', label: 'Front & Back Design Prompt', priceDeltaPaise: 0 },
          { id: 'brand-suite', label: 'Card + Letterhead Prompt Pair', priceDeltaPaise: 25000 },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: '1 Design Concept', multiplier: 1 },
      { quantity: 3, label: '3 Style Prompts', multiplier: 1.8, discountLabel: 'Save 40%' },
      { quantity: 5, label: '5 Agency Prompts', multiplier: 2.6, discountLabel: 'Save 48%' },
    ],
  },
  {
    id: 'prod-trifold-corporate-brochures',
    title: 'Corporate Tri-Fold Brochure & Flyer Design Prompt',
    slug: 'corporate-trifold-brochure-flyer-design',
    categoryId: 'cat-flyers-brochures',
    categoryName: 'Flyers & Brochures',
    shortDescription:
      'Sample Design · 6-panel tri-fold brochure & A5 promotional flyer layout prompt.',
    description:
      'Sample digital design package for flyers and brochures. Purchase unlocks structured panel-by-panel layout prompts covering cover headline, service breakdown panels, pricing callout boxes, and contact back panel.',
    imageUrl: '/images/flyers-brochures.jpg',
    basePricePaise: 69900,
    compareAtPricePaise: 109900,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: true,
    promptToolHint: 'Works with Midjourney, Ideogram, ChatGPT, Gemini, and Figma/Canva',
    promptInstructions:
      '1. Copy the unlocked prompt.\n2. Substitute [BUSINESS_NAME], [3_KEY_SERVICES], and [OFFER_HEADLINE].\n3. Generate both the open 3-panel flat spread and folded presentation mockup.',
    designPrompt:
      'Design a crisp 6-panel A4 tri-fold corporate brochure and matching A5 promotional flyer layout for [BUSINESS_NAME]. Use a balanced grid with sage-tinted neutral background (#F2F5F1), rich walnut headings (#2B1D14), and warm amber highlight callouts (#F59E0B). Cover panel: bold editorial headline "[OFFER_HEADLINE]", high-contrast hero visual frame, and bottom brand strip. Inside 3 panels: structured numbered sections for [3_KEY_SERVICES], clean icon badges, testimonial/trust block, and comparison table. Back panel: location pin, business hours, phone, and QR code.',
    optionGroups: [
      {
        id: 'layout',
        name: 'Document Format',
        type: 'size',
        required: true,
        choices: [
          { id: 'a4-trifold', label: 'A4 Tri-Fold Brochure (6 Panels)', priceDeltaPaise: 0 },
          { id: 'a5-flyer', label: 'A5 Promotional Flyer (Front/Back)', priceDeltaPaise: -10000 },
          { id: 'bundle', label: 'Brochure + Flyer Combo Prompts', priceDeltaPaise: 30000 },
        ],
      },
      {
        id: 'tone',
        name: 'Industry Direction',
        type: 'finish',
        required: true,
        choices: [
          { id: 'corporate', label: 'Clean Corporate & Real Estate', priceDeltaPaise: 0 },
          { id: 'retail-event', label: 'Retail Launch & Event Promo', priceDeltaPaise: 10000 },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: '1 Master Prompt', multiplier: 1 },
      { quantity: 3, label: '3 Format Prompts', multiplier: 1.75, discountLabel: 'Save 42%' },
      { quantity: 5, label: 'Commercial Studio Pack', multiplier: 2.5, discountLabel: 'Save 50%' },
    ],
  },
  {
    id: 'prod-rollup-standee-banner',
    title: 'Roll-Up Standee, Storefront & Signage Design Prompt',
    slug: 'rollup-standee-storefront-signage-design',
    categoryId: 'cat-banners-signage',
    categoryName: 'Banners & Signage',
    shortDescription:
      'Sample Design · High-visibility 6×3 ft standee, shop board & exhibition backdrop prompt.',
    description:
      'Sample digital design package for large-format banners and signage. Unlocks distance-readable typography ratios, focal visual framing, and color-contrast prompts tailored for roll-up standees, retail shop boards, and trade show booths.',
    imageUrl: '/images/banners-signage.jpg',
    basePricePaise: 79900,
    compareAtPricePaise: 119900,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: true,
    promptToolHint: 'Works with Ideogram, Midjourney, Gemini Image & Large-Format Canva Templates',
    promptInstructions:
      '1. Copy the unlocked prompt.\n2. Replace [EVENT_OR_SHOP_NAME], [HERO_HEADLINE], and [CALL_TO_ACTION].\n3. Choose 1:2 portrait aspect ratio for roll-up standees or 16:9 wide for shop hoardings.',
    designPrompt:
      'Design a high-impact vertical 6x3 ft exhibition roll-up standee banner for [EVENT_OR_SHOP_NAME] readable from 15 feet away. Top third: crisp studio logo and oversized bold display headline "[HERO_HEADLINE]" in cream white and amber glow (#F59E0B) over deep walnut-to-sage dark gradient (#231710 to #2E4035). Middle third: clean focal product illustration with three concise bullet highlights in high-contrast badges. Bottom third: bold action bar "[CALL_TO_ACTION]", large scannable QR code, phone number, and website URL with clean 2-inch safe bleed margins.',
    optionGroups: [
      {
        id: 'ratio',
        name: 'Signage Proportion',
        type: 'size',
        required: true,
        choices: [
          { id: 'standee-6x3', label: 'Vertical Standee (6 × 3 ft / 1:2)', priceDeltaPaise: 0 },
          { id: 'hoarding-wide', label: 'Wide Shop Fascia / Hoarding (3:1)', priceDeltaPaise: 20000 },
          { id: 'booth-backdrop', label: 'Exhibition Backdrop + Standee Pair', priceDeltaPaise: 45000 },
        ],
      },
      {
        id: 'style',
        name: 'Lighting & Contrast',
        type: 'finish',
        required: true,
        choices: [
          { id: 'daylight', label: 'High-Contrast Outdoor Daylight', priceDeltaPaise: 0 },
          { id: 'indoor-expo', label: 'Sleek Trade-Show Dark Editorial', priceDeltaPaise: 10000 },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: '1 Design Prompt', multiplier: 1 },
      { quantity: 3, label: '3 Signage Variations', multiplier: 1.8, discountLabel: 'Save 40%' },
    ],
  },
  {
    id: 'prod-custom-diecut-stickers',
    title: 'Die-Cut Sticker & Product Packaging Label Design Prompt',
    slug: 'diecut-sticker-packaging-label-design',
    categoryId: 'cat-stickers-labels',
    categoryName: 'Stickers & Labels',
    shortDescription:
      'Sample Design · Custom contour sticker sheet, jar label & metallic seal prompt.',
    description:
      'Sample digital design package for stickers and product labels. Unlocks crisp die-line contour prompts, bottle/jar front-and-back label grids, and foil-badge seal concepts ready for brands, food jars, cosmetics, and merch.',
    imageUrl: '/images/stickers-labels.jpg',
    basePricePaise: 44900,
    compareAtPricePaise: 69900,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: true,
    promptToolHint: 'Works with Ideogram, Midjourney, Gemini, Adobe Firefly & Sticker Mule Templates',
    promptInstructions:
      '1. Copy the unlocked prompt.\n2. Replace [PRODUCT_NAME], [FLAVOR_OR_VARIANT], and [NET_WEIGHT].\n3. Use 1:1 square for round/die-cut stickers or 4:3 for wrap-around bottle labels.',
    designPrompt:
      'Create a clean vector-style die-cut sticker and artisan product label design for [PRODUCT_NAME] ([FLAVOR_OR_VARIANT]). Framed inside an organic badge silhouette with a crisp white die-cut border, sage botanical leaf accents (#4D6F5E), deep walnut typography (#2B1D14), and warm amber-gold foil stamp frame (#F59E0B). Include centered emblem, bold product title, subtle botanical line-art background, batch/quality stamp, and clean bottom strip showing [NET_WEIGHT] and "[BRAND_NAME]" on a flat isolated white studio sheet for easy contour cutting.',
    optionGroups: [
      {
        id: 'shape',
        name: 'Sticker / Label Shape',
        type: 'size',
        required: true,
        choices: [
          { id: 'diecut', label: 'Custom Contour Die-Cut Sticker', priceDeltaPaise: 0 },
          { id: 'round-seal', label: 'Circular Jar / Box Seal (2 × 2 in)', priceDeltaPaise: 5000 },
          { id: 'wrap-label', label: 'Bottle Wrap-Around Packaging Label', priceDeltaPaise: 20000 },
        ],
      },
      {
        id: 'finish',
        name: 'Visual Surface Style',
        type: 'finish',
        required: true,
        choices: [
          { id: 'flat-vector', label: 'Clean Flat Vector Artwork', priceDeltaPaise: 0 },
          { id: 'gold-foil', label: 'Kraft & Metallic Foil Label Style', priceDeltaPaise: 15000 },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: '1 Label Prompt', multiplier: 1 },
      { quantity: 3, label: '3 SKU Variants', multiplier: 1.8, discountLabel: 'Save 40%' },
      { quantity: 5, label: 'Full Packaging Line', multiplier: 2.6, discountLabel: 'Save 48%' },
    ],
  },
  {
    id: 'prod-royal-wedding-invitations',
    title: 'Royal Wedding, Festive & Greeting Card Design Prompt',
    slug: 'royal-wedding-festive-invitation-card-design',
    categoryId: 'cat-invitations',
    categoryName: 'Invitation & Card Designs',
    shortDescription:
      'Sample Design · Ornate wedding invitation suite, RSVP insert & greeting card prompt.',
    description:
      'Sample digital design package for invitations and greeting cards. Unlocks intricate floral/mandala border framing, calligraphy typography hierarchy, event itinerary block, and matching envelope liner prompts.',
    imageUrl: '/images/invitations-cards.jpg',
    basePricePaise: 59900,
    compareAtPricePaise: 89900,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: true,
    promptToolHint: 'Works with Ideogram, Midjourney, ChatGPT, Canva & Gemini Image Studio',
    promptInstructions:
      '1. Copy the unlocked prompt.\n2. Replace [COUPLE_OR_HOST_NAMES], [EVENT_DATE_TIME], [VENUE], and [RSVP_CONTACT].\n3. Generate at 3:4 or 5:7 vertical portrait aspect ratio for print or WhatsApp e-vite sharing.',
    designPrompt:
      'Design an opulent vertical 5x7 wedding & formal event invitation card with matching RSVP card aesthetic. Background: textured warm cream cotton paper (#F7F9F6) framed by delicate sage botanical arches (#4D6F5E) and fine metallic gold-amber filigree corner motifs (#F59E0B). Centered editorial calligraphy heading "[COUPLE_OR_HOST_NAMES]" in deep walnut ink (#231710), followed by formal invitation verse, crisp serif details for [EVENT_DATE_TIME] and [VENUE], subtle monogram crest at top, and clean footer note for [RSVP_CONTACT]. Balanced symmetrical layout ready for both WhatsApp digital invite and high-res foil print.',
    optionGroups: [
      {
        id: 'cardType',
        name: 'Card Occasion',
        type: 'size',
        required: true,
        choices: [
          { id: 'wedding', label: 'Wedding / Engagement Suite (5 × 7 in)', priceDeltaPaise: 0 },
          { id: 'festive', label: 'Festive / Housewarming E-Invite', priceDeltaPaise: -5000 },
          { id: 'corporate-gala', label: 'Corporate Reception / Award Card', priceDeltaPaise: 15000 },
        ],
      },
      {
        id: 'suite',
        name: 'Suite Completeness',
        type: 'finish',
        required: true,
        choices: [
          { id: 'main-card', label: 'Main Invitation Card Prompt', priceDeltaPaise: 0 },
          { id: 'full-suite', label: 'Main + RSVP + Itinerary Prompts', priceDeltaPaise: 30000 },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: '1 Card Concept', multiplier: 1 },
      { quantity: 3, label: '3 Theme Variations', multiplier: 1.75, discountLabel: 'Save 42%' },
    ],
  },
  {
    id: 'prod-portfolio-landing-website',
    title: 'Portfolio, Agency & Service Website UI Design Prompt',
    slug: 'portfolio-agency-service-website-design',
    categoryId: 'cat-website-designs',
    categoryName: 'Website Designs',
    shortDescription:
      'Sample Design · High-trust service business, studio portfolio & lead-capture website prompt.',
    description:
      'Sample digital design package tailored for agencies, consultants, and local service brands. Unlocks a complete responsive landing page prompt featuring case-study showcase cards, service pricing grid, client testimonial layout, and contact booking form.',
    imageUrl: '/images/letterheads-stationery.jpg',
    basePricePaise: 99900,
    compareAtPricePaise: 159900,
    turnaroundDays: 'Instant Prompt Unlock',
    artworkRequired: false,
    featured: false,
    published: true,
    isSampleData: true,
    promptToolHint: 'Works with AI Website Builders, ChatGPT, Claude, Gemini & Figma',
    promptInstructions:
      '1. Copy the unlocked prompt.\n2. Fill in [AGENCY_OR_BRAND_NAME], [NICHE], and [TOP_3_SERVICES].\n3. Paste into your website generator or coding assistant to scaffold the full responsive landing page.',
    designPrompt:
      'Create a high-converting editorial service & portfolio website design for [AGENCY_OR_BRAND_NAME] in the [NICHE] industry. Color palette: Sage Green canvas (#F2F5F1), Walnut Brown authority headers (#231710 / #3A261B), and Amber Glow call-to-action buttons (#F59E0B). Include: sticky top header, asymmetric split hero with live work preview card, 3-column [TOP_3_SERVICES] section with clear INR pricing tiers, interactive portfolio filter grid, FAQ accordion, and clean quote request form + structured footer.',
    optionGroups: [
      {
        id: 'pages',
        name: 'Layout Scope',
        type: 'size',
        required: true,
        choices: [
          { id: 'one-page', label: 'Focused Single-Page Site', priceDeltaPaise: 0 },
          { id: 'multi-page', label: '5-Page Service + Blog Site', priceDeltaPaise: 45000 },
        ],
      },
      {
        id: 'theme',
        name: 'Color Theme Spec',
        type: 'finish',
        required: true,
        choices: [
          { id: 'sage-walnut', label: 'Sage Green, Walnut & Amber', priceDeltaPaise: 0 },
          { id: 'slate-minimal', label: 'Modern Monochrome + Gold', priceDeltaPaise: 15000 },
        ],
      },
    ],
    quantityTiers: [
      { quantity: 1, label: 'Standard License', multiplier: 1 },
      { quantity: 3, label: '3 Style Prompts', multiplier: 1.8, discountLabel: 'Save 40%' },
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
