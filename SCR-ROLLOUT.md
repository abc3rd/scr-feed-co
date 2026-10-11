# SCR Feed Co. order-ahead rollout

The customer flow is: counter/product QR → Base44 sign-in → customer profile →
available products at the selected store → cart → review → submit → order status.
The staff flow is: `/yard` → start picking → verify every line → mark ready →
collect payment through the store register → record that total → complete hand-off.

## Connect the real store

1. Use the existing SCR Base44 app and its GitHub integration. This repository
   remains the source of truth; sync the reviewed changes and publish from the
   Base44 dashboard as described below. Confirm that new function folders are
   included in the dashboard's sync before publishing.
2. Provision or use a dedicated PostgreSQL database accessible from Base44. A
   Supabase/Neon/other PostgreSQL connection is suitable when its TLS certificate
   is valid and its connection URL is reachable. Use a database account scoped to
   the SCR database. Do not reuse an unrelated app's tables or credentials.
3. In Base44's server environment settings, set **SCR_DATABASE_URL** to the actual
   PostgreSQL connection URI. The function uses verified TLS, a maximum of two
   connections per function instance, and disabled prepared statements for pooler
   compatibility. Keep this secret server-side. Never prefix it with `VITE_` or
   commit it. The frontend requires the existing **VITE_BASE44_APP_ID** and
   **VITE_BASE44_APP_BASE_URL**, and an optional functions-version setting.
4. Ensure the public customer registration and email verification/provider settings
   are configured in the existing Base44 app. Use Base44's user administration to
   assign the `admin` role only to authorized SCR staff. A customer cannot grant
   staff access through an SCR request; all staff actions also check the verified
   server identity's role. Verify Base44's built-in role protection in this app.
5. Sign in as an administrator and open `/inventory`. Select **Initialize store
   tables** for first-time setup. This creates only the empty `scr_` tables. It
   does not insert products, prices, customers, trucks, or orders. The app returns
   an explicit setup error until the database is connected and initialized.
6. Enter real SCR SKUs, package sizes, categories, unit prices, and physical stock
   counts. Select the location for each stock count. A product's catalog details
   and visibility are shared across locations; inventory is location-specific.
   Select an existing SKU to add it to the other location. Confirm that the
   existing location choices (LaBelle/Fort Myers) match the operational rollout.
7. Use `/qr` to print the counter sign-up code. Product links remain
   `/?sku=<actual SKU>&loc=<store>`; they survive the sign-in redirect. A member's
   QR is generated locally in Profile and requires that member's login to reveal
   their last completed order. QR possession alone does not grant data access.

## Inventory and payment behavior

- Server validation rejects invalid/duplicate quantities, missing or hidden
  products, stale prices, and insufficient available stock. Prices come from the
  database and must match the customer's reviewed price; cart totals are not
  trusted. Money is stored as integer cents.
- Creating an order locks its inventory rows in a PostgreSQL transaction and
  increases `reserved`. Available stock is `on_hand - reserved`. The physical
  count stays unchanged until staff complete hand-off.
- `Pending Ticket → Picking → Ready → Done` is the normal staff sequence. Marking
  Done deducts physical stock and releases the reservation in the same transaction.
  Cancelling releases the reservation without deducting physical stock. A customer
  may cancel only their own Pending Ticket; staff handle later cancellations.
- Request IDs, a transaction advisory lock, and unique constraints make checkout
  retries return the original order. The review page also recovers a committed
  order after an interrupted response. Repeated hand-off completion does not
  deduct stock again. Stale inventory/catalog edits and status updates are rejected.
- Pickup is pay-at-pickup. Delivery submissions include an address and requested
  date; staff must confirm the service area, schedule, and fee. The displayed item
  subtotal excludes tax and delivery fees. Staff enter the final register total.
  An order completion records a payment; it never makes a card charge.
- Contact choices are optional, unchecked by default, and persist with a disclosure
  version and timestamp. They do not send texts/emails. Configure and verify the
  store's messaging integration and consent disclosures before sending messages.
- Account deletion blocks while there are active orders. It removes the personal
  store profile, preferences, favorites, and QR, and anonymizes completed/cancelled
  order records. The backend then deletes the Base44 identity. If that second
  step fails, the UI reports it and permits an idempotent retry. A revocation
  tombstone prevents an unexpired token from recreating the deleted profile.
  Verify identity deletion against the actual Base44 app before store submission.

## Verification

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:mobile
```

Database tests execute the production SQL/service with PostgreSQL WASM (PGlite).
The mobile browser test executes that same service through intercepted API
requests. Only identity responses are fixtures; no production API is contacted.
The browser test checks ordering, reload, cancellation, staff hand-off, member QR
privacy, local QR rendering, mobile widths, and both color schemes. GitHub Actions
runs these checks on pull requests and main.

These tests do not establish live Base44 authentication/deployment, identity
deletion, PostgreSQL TLS connectivity, multi-instance concurrency, payment
processing, QuickBooks sync, or native-device behavior. Before a real pilot,
test simultaneous submissions for the last unit against the deployment database,
restart/reload persistence, rejected permissions, failed requests, actual sign-in,
and deletion. Confirm the staff ticket screen and store register agree on totals.
The customer history is currently limited to the latest 500 orders; the staff
queue shows at most 500 active orders per location. Expand pagination before a
larger rollout. No automatic stale-reservation expiry is promised; staff must
cancel abandoned orders to release stock.

## Pilot with the owner

Use the published web app with a real small catalog and an SCR staff account.
Submit one pickup order, see its ticket on `/yard`, mark it ready, complete
hand-off, and verify the stock count decreases once. Show cancellation and QR
reordering as well. Use an explicit test account and agree which real units are
being reserved; completed orders change the real stock count.

## Store submission remains a separate release step

This repository is a web/PWA source project. It does not contain a verified signed
iOS or Android release. Adding an iPhone Home Screen icon is not an App Store
submission. A native wrapper/build, verified bundle identifier, signing account,
store screenshots, accurate privacy disclosures, support contact, reviewer
credentials, and physical-device testing are still required for a store release.
The existing external legal links, cookie script, and app icon URLs must be
verified and owner-approved. This change does not claim that those hosted pages
or external integrations work, or that the app has store approval.
