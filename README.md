# Base44 Project

## Assistant security

`assistantChat` requires a Base44 user verified by `auth.me()`. The public site
and demo customer session do not grant access to paid AI. Anonymous calls return
401. The assistant UI offers Google sign-in when authentication is required.

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the Base44 backend
secrets, never in `VITE_*` variables or source code. Use a persistent Upstash
Redis database. One atomic Lua operation enforces 10 calls per 60-second window
and 100 per 24-hour window per verified user, plus 500 per 24-hour window across
all users. Windows start with the first accepted call. Limits are shared across
function replicas and restarts. User IDs are hashed in the Redis keys.

Missing configuration, Redis errors, or invalid limiter responses return 503
without calling the LLM. Quota exhaustion returns 429 with `Retry-After`.
Messages, total conversation size, and request bytes are bounded. AI failures
consume quota and do not trigger automatic retries.

Run the security checks with Node 24: `node --test tests/assistant-chat.test.mjs`.
These checks use injected auth/Redis/LLM responses and make no paid AI requests.
After publishing from Base44, verify anonymous calls return 401 and configured
signed-in calls enforce quotas. Repository changes alone do not protect an
already-published function; the backend must be published again.

Use this repository to run and edit the app locally, then publish changes back through Base44.

Any change pushed to the repo will also be reflected in the Base44 Builder.

## Prerequisites

1. Clone the repository using the project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.
4. Install the Base44 CLI: `npm install -g base44@latest`.
5. Install [Deno](https://docs.deno.com/runtime/getting_started/installation/) — the local Base44 backend runs on it.

Run `base44 --help` (or see the [CLI reference](https://docs.base44.com/developers/references/cli/commands/introduction)) for the full command surface.

## Run Locally

Three commands, from the project root:

```bash
base44 login   # one-time per machine
base44 link    # one-time per clone
base44 dev     # local backend + frontend together
```

Open the frontend URL that `base44 dev` prints (typically `http://localhost:5173`).

Notes:

- **Every fresh clone needs `base44 link`.** It writes `base44/.app.jsonc` (the app-id pointer), which is deliberately gitignored. Your app id is in the Builder URL (`app.base44.com/apps/<id>/...`); `base44 link --help` shows the non-interactive flags.
- **`base44 dev` runs the frontend for you** (via `site.serveCommand` in this repo's `base44/config.jsonc`) — never run `npm run dev` yourself: alone it serves a UI with no backend behind it (`[base44] Proxy not enabled`, every `/api` call fails), and alongside `base44 dev` the second Vite silently takes the next port and you end up looking at the wrong one.
- **The app must be published at least once for the UI to load under `base44 dev`.** The frontend boots by fetching app settings from the hosted app; before the first publish that fails and every page redirects to login. The local API works regardless.
- Entities, functions, and auth run locally — entity data is **in-memory only**, wiped when `base44 dev` restarts. Everything else (Core integrations, OAuth login) is forwarded to your deployed app. Full breakdown: [Local development overview](https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview).

## Frontend Only, Hosted Backend

To work on just the frontend against your app's live hosted backend:

```bash
base44 dev --remote
```

⚠️ In this mode writes go to your app's **production data** — plain `base44 dev` keeps everything local.

## Publish Your Changes

After pushing your changes to git, open the Base44 dashboard and publish the app:

```bash
base44 dashboard open
```

This repo syncs to Base44 through git, so publish from the dashboard rather than `base44 deploy` — a CLI deploy ships your local tree directly, bypassing the sync, and the deployed state silently diverges from the repo.

## Docs & Support

GitHub integration: [https://docs.base44.com/developers/app-code/local-development/github](https://docs.base44.com/developers/app-code/local-development/github)

Local development: [https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview](https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview)

Support: [https://app.base44.com/support](https://app.base44.com/support)

## Production customer backend

The frontend now uses verified Base44 login and `customerApi`; the mock API,
demo sign-in, fixed SMS verification code, and placeholder screens have been
removed. Publish the five new entity schemas and the `customerApi` function
through Base44 along with the assistant fix. No products, stock counts, orders,
truck arrivals, or saved cards are seeded.

Import verified store data into `Product` before enabling catalog access.
Each record is scoped by `location`, uses integer `price_cents` and `available`,
and can include existing UPC/barcode values in `barcodes`. `Order` and
`TruckArrival` contain actual store records only. Customer profiles and consent
records are written through the authenticated function, not directly by clients.

`customerApi` filters orders by verified user ID and checks ownership for order
details and member QR links. Admin accounts may read the yard queue. A member
QR selects the account's history only after the owner signs in; the QR itself
never grants access. QR images are generated locally using `qrcode`, with M
error correction, a four-module quiet zone, and whole-pixel module scaling with a minimum 240px image width.

Account deletion checks for active orders, removes profile and consent data,
anonymizes completed store orders, and deletes the Base44 user. Failure to
remove the user does not produce a successful deletion response. Admin users
must transfer administration first. This does not delete records held in
external accounting or payment platforms. No automatic seven-year deletion
schedule is implemented or claimed.

Online checkout is deliberately disabled until the real store payment and
inventory integration is implemented and verified. No card hold is simulated,
and customer API calls cannot decrement stock. Shopify, QuickBooks, HighLevel,
SMS delivery, financial fulfillment, and policy URLs still need configuration
and live verification before a Google Play release. Consent preferences are
stored in Base44; they are not yet synchronized to a messaging provider.

Verification: `node --test tests/*.test.mjs`, `npm run lint`, and `npm run build`.
The full-project `typecheck` currently has existing component typing errors;
the assistant handler has a separate strict TypeScript check. Auth/database
checks use injected dependencies and do not prove live Base44 publication.

Independent QR verification generated 15 symbols with the production encoder; all decoded to their exact original payloads in both OpenCV and ZXing. This includes 12 realistic member-link digests, a counter link, a UCP JSON payload, and Unicode text. These are raster decoder checks, not physical device camera tests. Generate fixtures with `node tests/qr-encode.mjs <temporary-output-directory>` and decode with independent tools.
