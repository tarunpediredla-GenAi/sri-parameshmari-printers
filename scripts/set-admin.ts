import 'dotenv/config';
import { getAuth } from 'firebase-admin/auth';
import { initFirebaseAdmin } from '../server/firebaseAdmin';

async function main() {
  const uid = process.argv[2]?.trim();
  if (!uid) {
    console.error('Usage: npm run set-admin -- <FIREBASE_UID>');
    process.exit(1);
  }

  const { app, db, hasServiceAccount } = initFirebaseAdmin();
  if (!app || !hasServiceAccount || !db) {
    console.error(
      'ERROR: Firebase Admin service account credentials are required to assign admin claims.\n' +
        'Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS in .env and try again.'
    );
    process.exit(1);
  }

  const authClient = getAuth(app);
  const user = await authClient.getUser(uid);
  const existingClaims = user.customClaims || {};
  await authClient.setCustomUserClaims(uid, { ...existingClaims, admin: true });

  await db.collection('admins').doc(uid).set({
    uid,
    email: user.email || '',
    grantedAt: new Date().toISOString(),
  });

  console.log(`Admin privileges granted to UID ${uid} (${user.email || 'no-email'}).`);
  console.log(
    'Note: The user must sign out and sign back in (or refresh their ID token) to receive the new claim.'
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to assign admin:', err);
  process.exit(1);
});
