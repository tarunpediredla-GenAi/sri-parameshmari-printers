import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesText = fs.readFileSync(rulesPath, 'utf8');

test('firestore.rules begins with global deny-all catch-all', () => {
  assert.match(rulesText, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules locks orders and payment_events client writes completely', () => {
  assert.match(rulesText, /match \/orders\/\{orderId\}[\s\S]*?allow create, update, delete: if false;/);
  assert.match(rulesText, /match \/payment_events\/\{eventId\}[\s\S]*?allow create, update, delete: if false;/);
  assert.match(rulesText, /match \/admins\/\{uid\}[\s\S]*?allow create, update, delete: if false;/);
});

test('firestore.rules restricts private orders, quotes, users, and artwork to owner or admin', () => {
  assert.match(rulesText, /match \/orders\/\{orderId\}[\s\S]*?existing\(\)\.userId == request\.auth\.uid \|\| isAdmin\(\)/);
  assert.match(rulesText, /match \/artwork_uploads\/\{uploadId\}[\s\S]*?existing\(\)\.userId == request\.auth\.uid \|\| isAdmin\(\)/);
  assert.match(rulesText, /match \/quotes\/\{quoteId\}[\s\S]*?existing\(\)\.userId == request\.auth\.uid \|\| isAdmin\(\)/);
});

test('firestore.rules requires email verification for quote creation and bootstrapped admin email', () => {
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /isVerifiedUser\(\)/);
});

test('storage.rules isolates customer artwork from public product folder', () => {
  const storageText = fs.readFileSync(path.resolve(process.cwd(), 'storage.rules'), 'utf8');
  assert.match(storageText, /match \/products\/\{allPaths=\*\*\}/);
  assert.match(storageText, /match \/artwork\/\{userId\}\/\{allPaths=\*\*\}[\s\S]*?request\.auth\.uid == userId \|\| isAdmin\(\)/);
  assert.match(storageText, /application\/pdf/);
});
