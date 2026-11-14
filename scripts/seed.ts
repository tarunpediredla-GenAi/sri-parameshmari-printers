import 'dotenv/config';
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
      ? 'Seeding sample print catalog into Cloud Firestore and local store...'
      : 'Firebase Admin service account not set; seeding sample print catalog into local runtime store...'
  );

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
