import { SAMPLE_PRODUCTS as publicProducts } from '../src/lib/catalogDefaults';
import type { Product } from '../src/types/print';

const deliverables: Record<string, Pick<Product, 'promptInstructions' | 'designPrompt'>> = {
  'prod-ecommerce-website-design': {
    promptInstructions: '1. Copy the unlocked prompt below.\n2. Replace [BRAND_NAME], [PRIMARY_OFFERING], and [CONTACT_EMAIL] with your brand details.\n3. Paste into your preferred AI website builder or UI design tool to generate the complete responsive website design.',
    designPrompt: 'Design and build a responsive editorial e-commerce website for [BRAND_NAME] specializing in [PRIMARY_OFFERING]. Use a grounded Sage Green (#F2F5F1 canvas, #3D5A4C accents), deep Walnut Brown (#231710 / #3A261B headers & anchors), and warm Amber Glow (#F59E0B primary CTAs) palette. Structure: 1) Sticky top navbar with brand mark, primary links, live search bar, and cart count badge. 2) Two-column hero on deep walnut-to-sage gradient featuring bold display typography, two CTA buttons, quick category chips, and an interactive Featured Spotlight card on the right. 3) Category showcase grid, filterable Shop grid with 4:3 cards, Product Configurator view, Cart & Checkout flow, and FAQ accordion + structured 4-column footer.',
  },
};

export const SAMPLE_PRODUCTS = publicProducts.map((product) => ({
  ...product,
  ...deliverables[product.id],
}));
