import { SAMPLE_PRODUCTS as publicProducts } from '../src/lib/catalogDefaults';
import type { Product } from '../src/types/print';

const deliverables: Record<string, Pick<Product, 'promptInstructions' | 'designPrompt'>> = {
  'prod-ecommerce-website-design': {
    promptInstructions: '1. Copy the unlocked prompt below.\n2. Replace [BRAND_NAME], [PRIMARY_OFFERING], and [CONTACT_EMAIL] with your brand details.\n3. Paste into your preferred AI website builder or UI design tool to generate the complete responsive website design.',
    designPrompt: 'Design and build a responsive editorial e-commerce website for [BRAND_NAME] specializing in [PRIMARY_OFFERING]. Use a grounded Sage Green (#F2F5F1 canvas, #3D5A4C accents), deep Walnut Brown (#231710 / #3A261B headers & anchors), and warm Amber Glow (#F59E0B primary CTAs) palette. Structure: 1) Sticky top navbar with brand mark, primary links, live search bar, and cart count badge. 2) Two-column hero on deep walnut-to-sage gradient featuring bold display typography, two CTA buttons, quick category chips, and an interactive Featured Spotlight card on the right. 3) Category showcase grid, filterable Shop grid with 4:3 cards, Product Configurator view, Cart & Checkout flow, and FAQ accordion + structured 4-column footer.',
  },
  'scope': {
    promptInstructions: '1. Copy the unlocked prompt.\n2. Fill in [FULL_NAME], [JOB_TITLE], [COMPANY_NAME], [PHONE], and [WEBSITE].\n3. Run the prompt at 16:9 or 3:2 landscape ratio to generate print-ready front & back business card artwork concepts.',
    designPrompt: 'Create an ultra-clean luxury double-sided business card graphic design (3.5 x 2 inch proportion, 300 DPI editorial studio layout) for [COMPANY_NAME]. Front side: deep matte charcoal-walnut background (#231710) with centered minimalist geometric monogram emblem and brand name in warm brushed gold foil (#F59E0B), refined serif + clean sans-serif pairing. Back side: warm ivory-sage matte surface (#F2F5F1) displaying [FULL_NAME], [JOB_TITLE], [PHONE], [EMAIL], [WEBSITE], and a crisp dark minimalist QR frame aligned to a balanced 2-column grid with generous margins and zero clutter.',
  },
  'format': {
    promptInstructions: '1. Copy the unlocked prompt.\n2. Substitute [BUSINESS_NAME], [3_KEY_SERVICES], and [OFFER_HEADLINE].\n3. Generate both the open 3-panel flat spread and folded presentation mockup.',
    designPrompt: 'Design a crisp 6-panel A4 tri-fold corporate brochure and matching A5 promotional flyer layout for [BUSINESS_NAME]. Use a balanced grid with sage-tinted neutral background (#F2F5F1), rich walnut headings (#2B1D14), and warm amber highlight callouts (#F59E0B). Cover panel: bold editorial headline "[OFFER_HEADLINE]", high-contrast hero visual frame, and bottom brand strip. Inside 3 panels: structured numbered sections for [3_KEY_SERVICES], clean icon badges, testimonial/trust block, and comparison table. Back panel: location pin, business hours, phone, and QR code.',
  },
  'layout': {
    promptInstructions: '1. Copy the unlocked prompt.\n2. Replace [EVENT_OR_SHOP_NAME], [HERO_HEADLINE], and [CALL_TO_ACTION].\n3. Choose 1:2 portrait aspect ratio for roll-up standees or 16:9 wide for shop hoardings.',
    designPrompt: 'Design a high-impact vertical 6x3 ft exhibition roll-up standee banner for [EVENT_OR_SHOP_NAME] readable from 15 feet away. Top third: crisp studio logo and oversized bold display headline "[HERO_HEADLINE]" in cream white and amber glow (#F59E0B) over deep walnut-to-sage dark gradient (#231710 to #2E4035). Middle third: clean focal product illustration with three concise bullet highlights in high-contrast badges. Bottom third: bold action bar "[CALL_TO_ACTION]", large scannable QR code, phone number, and website URL with clean 2-inch safe bleed margins.',
  },
  'ratio': {
    promptInstructions: '1. Copy the unlocked prompt.\n2. Replace [PRODUCT_NAME], [FLAVOR_OR_VARIANT], and [NET_WEIGHT].\n3. Use 1:1 square for round/die-cut stickers or 4:3 for wrap-around bottle labels.',
    designPrompt: 'Create a clean vector-style die-cut sticker and artisan product label design for [PRODUCT_NAME] ([FLAVOR_OR_VARIANT]). Framed inside an organic badge silhouette with a crisp white die-cut border, sage botanical leaf accents (#4D6F5E), deep walnut typography (#2B1D14), and warm amber-gold foil stamp frame (#F59E0B). Include centered emblem, bold product title, subtle botanical line-art background, batch/quality stamp, and clean bottom strip showing [NET_WEIGHT] and "[BRAND_NAME]" on a flat isolated white studio sheet for easy contour cutting.',
  },
  'shape': {
    promptInstructions: '1. Copy the unlocked prompt.\n2. Replace [COUPLE_OR_HOST_NAMES], [EVENT_DATE_TIME], [VENUE], and [RSVP_CONTACT].\n3. Generate at 3:4 or 5:7 vertical portrait aspect ratio for print or WhatsApp e-vite sharing.',
    designPrompt: 'Design an opulent vertical 5x7 wedding & formal event invitation card with matching RSVP card aesthetic. Background: textured warm cream cotton paper (#F7F9F6) framed by delicate sage botanical arches (#4D6F5E) and fine metallic gold-amber filigree corner motifs (#F59E0B). Centered editorial calligraphy heading "[COUPLE_OR_HOST_NAMES]" in deep walnut ink (#231710), followed by formal invitation verse, crisp serif details for [EVENT_DATE_TIME] and [VENUE], subtle monogram crest at top, and clean footer note for [RSVP_CONTACT]. Balanced symmetrical layout ready for both WhatsApp digital invite and high-res foil print.',
  },
  'cardType': {
    promptInstructions: '1. Copy the unlocked prompt.\n2. Fill in [AGENCY_OR_BRAND_NAME], [NICHE], and [TOP_3_SERVICES].\n3. Paste into your website generator or coding assistant to scaffold the full responsive landing page.',
    designPrompt: 'Create a high-converting editorial service & portfolio website design for [AGENCY_OR_BRAND_NAME] in the [NICHE] industry. Color palette: Sage Green canvas (#F2F5F1), Walnut Brown authority headers (#231710 / #3A261B), and Amber Glow call-to-action buttons (#F59E0B). Include: sticky top header, asymmetric split hero with live work preview card, 3-column [TOP_3_SERVICES] section with clear INR pricing tiers, interactive portfolio filter grid, FAQ accordion, and clean quote request form + structured footer.',
  },
};

export const SAMPLE_PRODUCTS = publicProducts.map((product) => ({
  ...product,
  ...deliverables[product.id],
}));
