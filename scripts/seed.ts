import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_STORE_SETTINGS,
  SAMPLE_CATEGORIES,
  SAMPLE_PRODUCTS,
} from '../src/lib/catalogDefaults';
import { initFirebaseAdmin } from '../server/firebaseAdmin';
import { saveCategory, saveProduct, saveStoreSettings } from '../server/store';

async function main() {
  const { hasServiceAccount } = initFirebaseAdmin();
  console.log(
    hasServiceAccount
      ? 'Seeding digital design catalog into Cloud Firestore and local store...'
      : 'Firebase Admin service account not set; seeding digital design catalog into local runtime store...'
  );

  // Cleanly reset local catalog categories/products so outdated prices/items are replaced
  const dataFile = path.resolve(process.cwd(), 'data', 'runtime-store.json');
  if (fs.existsSync(dataFile)) {
    try {
      const current = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      current.categories = [];
      current.products = [];
      fs.writeFileSync(dataFile, JSON.stringify(current, null, 2));
    } catch {
      // ignore parse issue
    }
  }

  for (const category of SAMPLE_CATEGORIES) {
    await saveCategory(category);
  }
  for (const product of SAMPLE_PRODUCTS) {
    await saveProduct({ ...product, updatedAt: new Date().toISOString() });
  }
  await saveStoreSettings({ ...DEFAULT_STORE_SETTINGS, updatedAt: new Date().toISOString() });

  console.log(
    `Seeded ${SAMPLE_CATEGORIES.length} categories, ${SAMPLE_PRODUCTS.length} sample products, and storefront settings.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
