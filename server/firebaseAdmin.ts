import fs from 'node:fs';
import path from 'node:path';
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

interface AppletFirebaseConfig {
  projectId: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
}

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const appletConfig: AppletFirebaseConfig = fs.existsSync(configPath)
  ? (JSON.parse(fs.readFileSync(configPath, 'utf8')) as AppletFirebaseConfig)
  : { projectId: process.env.FIREBASE_PROJECT_ID || 'famous-campaign-mcbh2' };

let adminApp: App | null = null;
let adminFirestore: Firestore | null = null;
let hasServiceAccount = false;

const storageBucket = process.env.FIREBASE_STORAGE_BUCKET?.trim() || appletConfig.storageBucket;

export function initFirebaseAdmin() {
  if (adminApp) {
    return { app: adminApp, db: adminFirestore, hasServiceAccount, storageBucket, config: appletConfig };
  }

  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const credFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
    } else if (rawJson) {
      const parsed = JSON.parse(rawJson) as ServiceAccount;
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: appletConfig.projectId,
        storageBucket,
      });
      hasServiceAccount = true;
    } else if (credFile && fs.existsSync(credFile)) {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: appletConfig.projectId,
        storageBucket,
      });
      hasServiceAccount = true;
    } else {
      adminApp = initializeApp({
        projectId: appletConfig.projectId,
        storageBucket,
      });
      hasServiceAccount = false;
    }

    if (hasServiceAccount && adminApp) {
      adminFirestore = appletConfig.firestoreDatabaseId
        ? getFirestore(adminApp, appletConfig.firestoreDatabaseId)
        : getFirestore(adminApp);
    }
  } catch (err) {
    console.warn('Firebase Admin initialization notice:', err instanceof Error ? err.message : err);
  }

  return { app: adminApp, db: adminFirestore, hasServiceAccount, storageBucket, config: appletConfig };
}

export interface VerifiedRequestUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

export async function verifyBearerToken(authHeader?: string): Promise<VerifiedRequestUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    return null;
  }

  const { app, db, hasServiceAccount: adminReady } = initFirebaseAdmin();
  if (!app) {
    return null;
  }

  const decoded = await getAuth(app).verifyIdToken(idToken);
  const bootstrapAdminEmail = (
    process.env.ADMIN_BOOTSTRAP_EMAIL || 'tarunpediredla9966@gmail.com'
  ).toLowerCase();

  let isAdmin = decoded.admin === true;
  if (
    !isAdmin &&
    decoded.email &&
    decoded.email_verified &&
    decoded.email.toLowerCase() === bootstrapAdminEmail
  ) {
    isAdmin = true;
  }
  if (!isAdmin && adminReady && db) {
    try {
      const adminDoc = await db.collection('admins').doc(decoded.uid).get();
      if (adminDoc.exists) {
        isAdmin = true;
      }
    } catch {
      // Ignore lookup error and rely on custom claim
    }
  }

  return {
    uid: decoded.uid,
    email: decoded.email || '',
    emailVerified: Boolean(decoded.email_verified),
    isAdmin,
  };
}
