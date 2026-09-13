# Nilasaar Website

Static site built with [Eleventy (11ty)](https://www.11ty.dev/), content-managed
through [Decap CMS](https://decapcms.org/) so prices, photos, and descriptions
can be updated by anyone — no code, no redeploy — for both **honey** and
**coffee** product lines.

## Run it locally

```bash
npm install
npm start
```

This serves the site at `http://localhost:8080` with live reload.

To produce the final static files (what actually gets deployed):

```bash
npm run build
```

Output goes to `_site/`.

## Project structure

```
src/
  _includes/base.njk     -> shared page layout (header/nav/footer/cart drawer)
  index.njk               -> homepage, loops over the products collection
  products/*.md           -> ONE FILE PER SKU (this is what Decap CMS edits)
  css/style.css           -> styling
  js/cart.js               -> cart state + Razorpay Checkout flow
  admin/index.html         -> Decap CMS admin panel loader
  admin/config.yml         -> Decap CMS schema (fields, categories, backend)
  images/uploads/          -> where uploaded product photos land

api/                       -> Vercel serverless functions (payments backend)
  create-order.js           -> validates cart against server-side prices, creates a Razorpay order
  verify-payment.js         -> confirms a payment's signature so the browser can show a success screen
  webhook.js                 -> Razorpay's server-to-server callback; the actual source of truth, sends the order email
  _products.json             -> generated at build time from src/products/*.md — do not edit by hand

scripts/generate-product-manifest.js -> writes api/_products.json (runs automatically via npm run build)
```

## Adding a new product by hand (before Decap auth is wired up)

Copy `src/products/wild-honey-300g.md`, rename the file, and edit the
frontmatter:

```yaml
---
title: "Kongu Roast Coffee"
category: "coffee"
price: 349
image: "/images/uploads/your-image.jpg"
featured: false
description: >
  Single-origin coffee from the Kongu hills, roasted in small batches.
---
```

Because the homepage template groups by `category`, a coffee product just
appears in the Coffee section automatically — no template changes needed.

## Turning on the CMS itself (`/admin`)

Right now `/admin` will load but won't be able to log in yet — Decap needs an
auth backend connected first. Since the live site is on Vercel/Cloudflare
(not Netlify), we use Netlify purely as a free OAuth relay — it never hosts
or serves the actual site, it just handles the "log in with GitHub" step.
This is a one-time setup:

1. **Create a GitHub OAuth App** — GitHub → Settings → Developer settings →
   OAuth Apps → New OAuth App.
   - Homepage URL: `https://nilasaar.in` (or anything, it's not checked)
   - Authorization callback URL: `https://api.netlify.com/auth/done`
   - Save it, then generate a **Client Secret**. Keep the Client ID + Secret
     handy for the next step.

2. **Connect that OAuth App to Netlify** (Netlify just brokers the login —
   no need to deploy anything real there):
   - Create a free Netlify account if you don't have one, and add this repo
     as a new site (any settings are fine; you'll never actually use its
     build output).
   - In that site's dashboard, go to **Site configuration → Access control →
     OAuth** (Netlify sometimes calls this "Git-based CMS" or similar —
     look for a place to add an OAuth client) and add a provider for
     **GitHub**, pasting in the Client ID and Client Secret from step 1.

3. `src/admin/config.yml` is already set up to use this
   (`base_url: https://api.netlify.com`) — no code changes needed.

Once steps 1–2 are done, visiting `nilasaar.in/admin` gives a "Login with
GitHub" button, then a form per product (name, category, price, description,
drag-and-drop photo) that commits straight to this repo. Your host (Vercel/
Cloudflare/etc.) then rebuilds automatically on that commit, same as any
other push.

If you'd rather move the real site to Netlify later, it's simpler: switch
`backend.name` in `src/admin/config.yml` to `git-gateway` and enable
**Identity + Git Gateway** in the Netlify dashboard instead of the OAuth App
dance above.

## Deploying

The site is deployed on **Vercel**. `vercel.json` tells it to run
`npm run build` and publish the `_site` folder; the `api/` folder is deployed
automatically as serverless functions (no extra config needed).

## Payments (Razorpay)

Checkout is a real cart: customers add products, enter delivery details, and
pay via Razorpay Checkout. Prices are never trusted from the browser — the
`api/create-order` function recomputes the total from `api/_products.json`
(auto-generated from the same markdown files Decap CMS edits), so someone
tampering with the page can't change what they're charged.

**One-time setup**, using [.env.example](.env.example) as the checklist:

1. **Razorpay account** — sign up at razorpay.com, complete KYC for live
   payments (test mode works immediately, no KYC needed).
2. **API keys** — Razorpay Dashboard → Settings → API Keys → generate a key
   pair. Start with **Test Mode** keys while you try things out. Put these
   in Vercel (Project → Settings → Environment Variables) as
   `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
3. **Webhook** — Razorpay Dashboard → Settings → Webhooks → Add New Webhook:
   - URL: `https://nilasaar.in/api/webhook`
   - Active events: `payment.captured`
   - Set a webhook secret, and also add it to Vercel as
     `RAZORPAY_WEBHOOK_SECRET`.
   This is what actually confirms a paid order and triggers the notification
   email — it comes from Razorpay's servers, so it's reliable even if a
   customer closes their browser right after paying.
4. **Resend account** (for the order email) — sign up at resend.com, verify
   a sending domain or address, and create an API key. Add to Vercel as
   `RESEND_API_KEY`, `ORDER_EMAIL_FROM` (the verified sender), and
   `ORDER_EMAIL_TO` (your inbox).
5. Redeploy after adding the environment variables (Vercel only picks up new
   env vars on the next deploy).

**Testing**: with Test Mode keys, use Razorpay's published test card numbers
(e.g. `4111 1111 1111 1111`, any future expiry, any CVV) to run a full
checkout without moving real money. Switch to live keys only once you've
confirmed a test order arrives correctly by email.
