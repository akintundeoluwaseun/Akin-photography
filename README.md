# Akin Photography

Website, booking system and admin dashboard for **Akin Photography**, Onala Street, Ado-Ekiti, Ekiti State.

- Seven public pages in English: Home, About, Services, Portfolio, Pricing, Booking, Contact
- Booking requests are stored in the dashboard and can be sent to the business on **WhatsApp**
- Admin dashboard at `/admin` with five tabs: Overview, Inbox (bookings, calendar, enquiries), Photos (drag to reorder, bulk edit, choose where each photo is used), Website (page text, services and prices, testimonials, SEO) and Settings (contact details, hours, social links, account). Optional browser alerts for new requests while the admin is open
- Photographs are resized automatically (WebP, three sizes) for fast loading on slow connections
- SEO: per-page titles and descriptions, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`

Nothing is invented. Phone, WhatsApp, email, prices and testimonials start **empty** and buttons that need them stay hidden until the owner fills them in. Until photographs are uploaded, tasteful tonal tiles stand in for them.

## Run it

```bash
npm install
cp .env.example .env      # then edit
npm start                 # http://localhost:3000
```

Sign in at `/admin` with the phone number **07030129673** and the password you were given. The sign-in is defined in the code (`lib/admin-account.js`, a phone number and a password hash). Change either under **Settings → Account**.

## Deploy

This is a Node server with a SQLite database and uploaded files, so it needs a host with a **persistent disk** (Render, Railway, Fly.io, a VPS). Serverless hosts such as Vercel cannot keep the database or uploads.

1. Create a web service from this repo: build `npm install`, start `npm start`.
2. Attach a persistent disk and set `DATA_DIR` to its path.
3. Set `NODE_ENV=production` and `SITE_URL`.
4. Sign in at `/admin` and fill in: **Contact details** (phone, WhatsApp, email), **Opening hours**, **Social media**, upload photographs in **Gallery**, set prices in **Services & prices**.

Back up the `DATA_DIR` folder regularly: it holds every booking and photograph.

## Security notes

Passwords use scrypt. Admin sessions are server-side, HTTP-only cookies; every admin form carries a CSRF token. Public forms have CSRF tokens, a honeypot and rate limits. Uploads are re-encoded by `sharp`, so non-images are rejected. A strict Content-Security-Policy is sent on every page. No secret is ever sent to the browser.

## Starter photographs

On first run, if the gallery is empty, the photographs in `seed/photos/` are loaded and placed across the site (home hero, About page, each service, closing banner, gallery). Replace them with your own work in **Admin → Gallery**; use the buttons there to choose the home hero and About photo, and **Services & prices** to choose each service's photo.

## Alerts for new bookings and messages

The dashboard can send **push notifications** to your phone or computer the moment a booking request or message arrives, even when the browser or app is closed.

1. Deploy the site on its secure (https) address and set `SITE_URL` (for example `https://akinphotography.com`).
2. Open `/admin` on the device, go to **Overview → Alerts on this device**, and follow the steps there (Android: install the app from Chrome's menu; iPhone: Add to Home Screen, open it from there). Tap **Turn on alerts**.
3. Do this once on each device that should get alerts.

Keys are created automatically and stored in the database; you can fix them with `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` if you prefer. Browsers decide final delivery, so alerts can be delayed when a phone is in battery-saver mode.

## Credit link

The footer shows "Website by Oluwaseun", linking to the developer's portfolio. Change the address with `CREDIT_URL`.


## Deploying on Vercel (changes are kept in your GitHub repo)

Vercel's disk is read-only, so the site saves its database and photos to a separate **`data`** branch of your GitHub repo. No other service or database is needed. That branch is never deployed.

1. GitHub → Settings → Developer settings → Fine-grained tokens → generate one for this repository only, with **Contents: Read and write**.
2. In Vercel → Project → Settings → Environment Variables, add `GITHUB_TOKEN` with that value, then redeploy.
3. Sign in at `/admin`. Edits, bookings, uploads and deletions are saved to the `data` branch (the database is encrypted; photos are stored as files). Deleted photos stay deleted and the starter photos do not come back.

Notes: each save adds about one to two seconds. If two people save at the same moment, the later save wins. Keep the repo **private**, since the branch holds your bookings (encrypted) and photos. Photos are resized in the browser before upload so they fit Vercel's 4.5 MB request limit.
