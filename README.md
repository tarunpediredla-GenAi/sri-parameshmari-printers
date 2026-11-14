# Sri Parameshmari Printers — E-Commerce Storefront & Print Operations

A full-stack e-commerce web application for **Sri Parameshmari Printers** built with React, TypeScript, Tailwind CSS, Express, Firebase (Authentication, Cloud Firestore, Cloud Storage), and Razorpay Standard Checkout (INR).

---

## 1. Prerequisites & Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

---

## 2. Firebase Console Setup

1. **Enable Sign-In Providers**:
   - Open the [Firebase Console](https://console.firebase.google.com/) and select your provisioned project (`famous-campaign-mcbh2` or your project ID in `firebase-applet-config.json`).
   - Go to **Authentication → Sign-in method**.
   - Enable **Email/Password** (also enable Email link / verification templates under **Templates**).
   - Enable **Google** and set your project support email.
2. **Add Authorized Domains**:
   - Under **Authentication → Settings → Authorized domains**, add your deployed domain (for example `your-app.run.app` or your custom domain) alongside `localhost`.
3. **Firebase Admin SDK Credentials (Server-Side)**:
   - Go to **Project Settings → Service accounts → Generate new private key**.
   - Either save the JSON file and set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json` in `.env`, or minify it into a single line as `FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'`.
4. **Deploy Security Rules & Indexes**:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
5. **Seed Sample Print Catalog & Settings**:
   ```bash
   npm run seed
   ```
6. **Assign Your First Admin**:
   - Sign in once in the web app so your user appears in **Firebase Console → Authentication → Users**.
   - Copy your user's **UID** and run:
     ```bash
     npm run set-admin -- <YOUR_FIREBASE_UID>
     ```
   - Sign out and sign back in so your Firebase ID token refreshes with the `{ admin: true }` custom claim.

---

## 3. Razorpay Test Mode & Webhook Configuration

1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com/) and switch the top toggle to **Test Mode**.
2. Go to **Account & Settings → API Keys → Generate Test Key**:
   - Set `RAZORPAY_KEY_ID` (`rzp_test_...`) in `.env`.
   - Set `RAZORPAY_KEY_SECRET` in `.env`.
3. Configure **Razorpay Webhooks**:
   - Go to **Account & Settings → Webhooks → Add New Webhook**.
   - Set **Webhook URL** to:
     ```
     https://<YOUR_DEPLOYED_DOMAIN>/api/webhooks/razorpay
     ```
   - Set a **Secret** and copy that exact string into `RAZORPAY_WEBHOOK_SECRET` in `.env`.
   - Subscribe to **Active Events**:
     - `payment.captured`
     - `payment.failed`
   - Note: `/api/webhooks/razorpay` is mounted before JSON body parsing using `express.raw({ type: 'application/json' })` so HMAC-SHA256 signature verification runs against the exact raw request bytes.

---

## 4. Running Locally & Testing

- **Development server (Express + Vite on port 3000)**:
  ```bash
  npm run dev
  ```
- **Run unit & security rule tests**:
  ```bash
  npx tsx --test src/lib/pricing.test.ts server/razorpayUtils.test.ts firestore.rules.test.ts
  ```
- **Lint TypeScript & Firestore security rules**:
  ```bash
  npm run lint
  npm run lint:rules
  ```
- **Production build & start**:
  ```bash
  npm run build
  NODE_ENV=production npm start
  ```

---

## 5. Customizing Shop Details & Sample Catalog

- Sample catalog items (business cards, flyers, brochures, banners, stickers, invitations, and letterheads) are clearly labeled **Sample Catalog**.
- Sign in as an Admin and open `/admin` → **Shop Settings & Policies** to fill in your shop address, proprietor/legal entity name, support email, phone helpline, business hours, GST percentage, shipping fee, free shipping threshold, and policy pages.
