# Akin Photography

Website, booking system and admin dashboard for **Akin Photography**, Onala Street, Ado-Ekiti, Ekiti State.

- Seven public pages in **English and Yoruba** (`/` and `/yo/`): Home, About, Services, Portfolio, Pricing, Booking, Contact
- Booking requests are stored in the dashboard and can be sent to the business on **WhatsApp**
- Admin dashboard at `/admin`: gallery upload, services and prices, bookings, enquiries, testimonials, opening hours, social links, page text
- Photographs are resized automatically (WebP, three sizes) for fast loading on slow connections
- SEO: per-page titles and descriptions, Open Graph, hreflang, JSON-LD, `sitemap.xml`, `robots.txt`

Nothing is invented. Phone, WhatsApp, email, prices and testimonials start **empty** and buttons that need them stay hidden until the owner fills them in. Until photographs are uploaded, tasteful tonal tiles stand in for them.

## Run it

```bash
npm install
cp .env.example .env      # then edit
npm start                 # http://localhost:3000
```

On first start an admin account is created. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`, or read the generated password from `data/FIRST_RUN_ADMIN.txt`, sign in at `/admin`, then change it under **Account**.

## Deploy

This is a Node server with a SQLite database and uploaded files, so it needs a host with a **persistent disk** (Render, Railway, Fly.io, a VPS). Serverless hosts such as Vercel cannot keep the database or uploads.

1. Create a web service from this repo: build `npm install`, start `npm start`.
2. Attach a persistent disk and set `DATA_DIR` to its path.
3. Set `NODE_ENV=production`, `SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
4. Sign in at `/admin` and fill in: **Contact details** (phone, WhatsApp, email), **Opening hours**, **Social media**, upload photographs in **Gallery**, set prices in **Services & prices**.

Back up the `DATA_DIR` folder regularly: it holds every booking and photograph.

## Security notes

Passwords use scrypt. Admin sessions are server-side, HTTP-only cookies; every admin form carries a CSRF token. Public forms have CSRF tokens, a honeypot and rate limits. Uploads are re-encoded by `sharp`, so non-images are rejected. A strict Content-Security-Policy is sent on every page. No secret is ever sent to the browser.

## Yoruba text

The Yoruba is written to read naturally, but please have a fluent Yoruba speaker review it. Every Yoruba line can be edited in the dashboard (home, about, services, testimonials); interface labels live in `lib/i18n.js`.
