# MS Shop API

Express 5 + MongoDB (Mongoose) backend for the storefront (`../my-app`) and admin dashboard (`../dashboard`).

## Run

```bash
npm install
npm run seed   # first time: superadmin from ADMIN_* in .env + the 6 storefront shirts
npm run dev    # http://localhost:5000 (restarts on file changes)
npm start      # production
npm run reset-admin   # locked out? sets ADMIN_EMAIL's password to ADMIN_PASSWORD from .env
```

Editing `ADMIN_PASSWORD` in `.env` does nothing by itself — the seed only creates the first admin. Run `npm run reset-admin` to apply it, or change the password in the dashboard (Settings).

Start order: API → dashboard (`cd ../dashboard && npm run dev`, port 5173) → storefront (`cd ../my-app && npm run dev`, port 3000).

## .env

| Key | |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | 32+ random characters; changing it signs everyone out |
| `CLIENT_URLS` | Origins allowed to call the API (dashboard in production) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | The shop's one admin, used by `npm run seed` and `npm run reset-admin` (which also clears a stuck session) |
| `SESSION_IDLE_MINUTES` | Default 15. While the admin is signed in, other sign-ins are refused until they log out or the session is idle this long |
| `TRACK_STOCK` | `true` = reject sold-out sizes and show low-stock alerts |
| `TRUST_PROXY` | Proxies in front of the API (default 1: the Next.js storefront) |
| `STEADFAST_*`, `META_*` | Optional fallbacks; normally set from the dashboard Settings page |

## How orders work

- The storefront posts to its own `/api/order`, which forwards to `POST /api/orders`. The server reloads prices from MongoDB: every 3 shirts cost ৳990, plus ৳70 (inside Dhaka) or ৳130 (outside).
- Re-submitting the same order from the same phone within 10 minutes returns the first order instead of making a copy.
- Order IDs look like `MS-261004-0001` (Bangladesh date + daily counter).
- Status flow: pending → confirmed → processing → shipped → delivered, with cancelled/returned as exits. Cancelling or returning restores stock and takes the amount off the customer's total; delivered marks the order paid.

## Steadfast

Dashboard → Settings → Steadfast courier: paste the API key and secret key from the Steadfast merchant panel, then **Test connection** (reads the balance).
On a confirmed order, **Send to Steadfast** creates a COD parcel (invoice = order ID) and marks the order shipped. **Sync status** pulls the courier status; `delivered` marks the order delivered + paid, `cancelled` marks it returned.

## Meta Pixel

Dashboard → Settings → Meta Pixel: paste the Pixel ID. The storefront picks it up within a minute and tracks PageView, AddToCart, InitiateCheckout and Purchase.
Adding a Conversions API access token also sends Purchase from the server (same event ID as the browser, so Meta de-duplicates).

## Layout

```
config/       db.js, shop.js (prices, areas, statuses)
models/       Admin, Order, Product, Customer, Setting, Counter
controllers/  one per resource
services/     orderService (pricing, stock), steadfastService, metaService, settingsService
routes/       /api/admin, /api/orders, /api/products, /api/customers, /api/settings
middleware/   auth, superadmin, uploads, rate limits, errors
validators/   zod schemas
scripts/      seed.js
uploads/      product images (not in git)
```
