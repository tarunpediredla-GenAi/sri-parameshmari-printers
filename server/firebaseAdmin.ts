import fs from 'node:fs';
import path from 'node:path';
import {
  applicationDefault,
  cert,
  getApp,
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
let dataProjectId: string | null = null;

function getNamedApp(name: string): App | null {
  try {
    return getApp(name);
  } catch {
    return null;
  }
}

export function initFirebaseAdmin() {
  if (adminApp) {
    return {
      app: adminApp,
      db: adminFirestore,
      hasServiceAccount,
      config: appletConfig,
      dataProjectId,
    };
  }

  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const credFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  try {
    // Auth app: verifies logins against the ORIGINAL project
    // (famous-campaign-mcbh2, from firebase-applet-config.json). It needs no
    // service account — verifyIdToken uses Google's public keys.
    adminApp =
      getNamedApp('auth') ??
      initializeApp(
        {
          projectId: appletConfig.projectId,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
        },
        'auth'
      );

    // Data app: saves orders/catalog/quotes in the NEW project
    // (sri-parameshmari-printers, Firestore (default), asia-south1).
    // Its service account comes from FIREBASE_SERVICE_ACCOUNT_JSON, whose
    // project_id is the new project's ID. Simply swapping the credential in
    // Vercel would NOT split auth and data — the old code used one app for
    // both, with the old project's ID. This keeps the two apps separate.
    const dataApp = getNamedApp('data');
    if (dataApp) {
      adminFirestore = getFirestore(dataApp);
      adminFirestore.settings({ ignoreUndefinedProperties: true });
      hasServiceAccount = true;
      dataProjectId = (dataApp.options as { projectId?: string }).projectId ?? null;
    } else if (rawJson) {
      const parsed = JSON.parse(rawJson) as ServiceAccount & { project_id?: string };
      dataProjectId = parsed.project_id || process.env.FIREBASE_DATA_PROJECT_ID || 'sri-parameshmari-printers';
      const app = initializeApp(
        { credential: cert(parsed), projectId: dataProjectId },
        'data'
      );
      adminFirestore = getFirestore(app);
      adminFirestore.settings({ ignoreUndefinedProperties: true });
      hasServiceAccount = true;
    } else if (credFile && fs.existsSync(credFile)) {
      const app = initializeApp({ credential: applicationDefault() }, 'data');
      adminFirestore = getFirestore(app);
      adminFirestore.settings({ ignoreUndefinedProperties: true });
      hasServiceAccount = true;
      dataProjectId = (app.options as { projectId?: string }).projectId ?? null;
    }
  } catch (err) {
    console.warn('Firebase Admin initialization notice:', err instanceof Error ? err.message : err);
  }

  return {
    app: adminApp,
    db: adminFirestore,
    hasServiceAccount,
    config: appletConfig,
    dataProjectId,
  };
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
