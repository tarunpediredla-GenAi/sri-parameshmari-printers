# Firestore Security Specification — Sri Parameshmari Printers

## 1. Data Invariants
1. **Catalog Isolation**: Only `published == true` products and `active == true` categories are readable publicly; draft/unpublished items and all catalog mutations require `isAdmin()`.
2. **Order & Payment Integrity**: Clients cannot directly create, modify, or delete `/orders/{orderId}` or `/payment_events/{eventId}`. Order totals (in integer paise), Razorpay order IDs, `paymentStatus`, and `fulfillmentStatus` are exclusively managed by the Express backend using Firebase Admin SDK.
3. **Owner-Only PII & Artwork**: User profiles (`/users/{userId}`), orders (`/orders/{orderId}`), quotes (`/quotes/{quoteId}`), and artwork metadata (`/artwork_uploads/{uploadId}`) are readable only by their owning authenticated user (`uid == request.auth.uid`) or an authorized admin.
4. **Privilege Escalation Guard**: Users cannot write to `/admins/{uid}` or set admin/role fields in `/users/{userId}`.
5. **Quote State Integrity**: Customers may only create quotes with `status == 'submitted'`, `userId == request.auth.uid`, and server timestamp `createdAt == request.time`. Only admins may update `status`, `quotedPricePaise`, or `adminResponse`.
6. **Path & Payload Bounds**: Every document ID matches `^[a-zA-Z0-9_-]+$` (`<= 128` chars), and every string/list field enforces strict `.size()` bounds.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Order Tampering**: Anonymous `POST /orders/ord_1` with `{ totalPaise: 100, paymentStatus: 'paid' }` -> `PERMISSION_DENIED`.
2. **Customer Self-Marking Order Paid**: Signed-in owner `UPDATE /orders/ord_1` changing `paymentStatus` to `'paid'` -> `PERMISSION_DENIED`.
3. **Cross-Customer Order Read**: Signed-in User B `GET /orders/ord_owned_by_A` -> `PERMISSION_DENIED`.
4. **Cross-Customer List Scraping**: Signed-in User B `LIST /orders` without `where('userId', '==', uid_B)` -> `PERMISSION_DENIED`.
5. **Self-Assigned Admin Marker**: Signed-in User `CREATE /admins/{uid}` with `{ uid, email }` -> `PERMISSION_DENIED`.
6. **Shadow Field Injection on Profile**: Signed-in User `CREATE /users/{uid}` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
7. **Unverified Email Spoofing Admin**: User with `email: 'tarunpediredla9966@gmail.com'` and `email_verified: false` attempting admin product creation -> `PERMISSION_DENIED`.
8. **Quote Price Self-Approval**: Signed-in User `CREATE /quotes/q_1` with `status: 'quoted'` or `quotedPricePaise: 1` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Signed-in User `CREATE /quotes/q_1` with backdated `createdAt` (`!= request.time`) -> `PERMISSION_DENIED`.
10. **ID Poisoning Attack**: Signed-in User `CREATE /users/<1500-char-string>` -> `PERMISSION_DENIED`.
11. **Cross-Customer Artwork Metadata Access**: User B `GET /artwork_uploads/art_owned_by_A` -> `PERMISSION_DENIED`.
12. **Draft Product Leak**: Public anonymous `GET /products/draft_1` where `published: false` -> `PERMISSION_DENIED`.
