# Blue2Me Fischbox Landing — Tech Stack & Architecture

## Overview

A lightweight, standalone marketing landing page that sells the Blue2Me Starter Box
directly via Shopify's Storefront API. No Shopify theme, no Next.js frontend,
no build step. Pure static HTML/CSS/JS served from a CDN.

## Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Frontend     | Static HTML5, vanilla JavaScript (no framework) |
| Styling      | Hand-written CSS (`assets/global.css`)          |
| Fonts        | Google Fonts (Inter, Poppins, Inria Serif)      |
| Hosting      | Vercel (static deploy, free tier, HTTPS + CDN)  |
| Commerce     | Shopify Storefront API (GraphQL, version 2024-10) |
| Subscriptions| Shopify Selling Plans (native Shopify Subscriptions) |
| Checkout     | Shopify-hosted checkout (not custom)            |

## Files

```
dist/
├── index.html              Production landing (all sections, no build needed)
├── vercel.json             Vercel deploy config (cache headers, security headers)
├── README.md               Setup guide for Shopify config
├── TECH-STACK.md           This file
└── assets/
    ├── config.js           Shopify credentials (shop domain, public token, handle)
    ├── shop.js             Storefront API integration, cart logic
    ├── theme.js            UI interactions (mobile nav, reveal, accordions)
    ├── global.css          All styles
    └── *.jpg / *.png       ~30 images (hero, products, testimonials)
```

Total size: ~4 MB uncompressed, ~1 MB after Vercel edge compression.

## Shopify Integration — How It Works

### 1. Connection (set once in `assets/config.js`)

```js
window.BLUE2ME_CONFIG = {
  shopDomain: 'blue2me.myshopify.com',
  storefrontToken: 'a331a6044b4285e04e76d3e60a1499e4',
  productHandle: 'blue2me-starter-box'
};
```

The `storefrontToken` is the **public** Storefront API token from the "Blue2me Headless"
sales channel in Shopify Admin. It is safe to expose in client-side code.
Only the permissions granted to that token (read products, write checkouts, etc.)
are accessible.

### 2. Product Load (on page load)

When the landing page loads, `shop.js` makes one GraphQL request to Shopify:

```
POST https://blue2me.myshopify.com/api/2024-10/graphql.json
Header: X-Shopify-Storefront-Access-Token: <public token>
Query: product(handle: "blue2me-starter-box") { variants, sellingPlanGroups }
```

The response is cached in memory for the session. It provides:
- The default variant ID and live price
- All active Selling Plans (subscription rhythms like "every 14 / 28 / 42 days")

These plans render as radio buttons in the buy section, plus an "Einmalig" option
for one-time purchase.

### 3. Cart Creation (on "Add to cart" / "Buy now")

```
mutation cartCreate(input: {
  lines: [{ merchandiseId, quantity, sellingPlanId? }],
  buyerIdentity: { countryCode: DE }
})
```

Shopify returns a `cart.id` (stored in `localStorage` for persistence) and a
`cart.checkoutUrl`. The user is redirected to the checkout URL and completes
the purchase in Shopify's native, PCI-compliant checkout. No payment or
customer data ever touches our landing page.

### 4. Cart Persistence

The cart ID is saved in `localStorage` under the key `blue2me-cart-id`.
On return visits, the cart is fetched via `cart(id: ...)` so the customer
can continue without losing items.

### 5. Checkout URL Normalization

Shopify's checkout URL uses the store's primary domain, which for this store
is `blue2me.com` (used by the existing subscription portal on Next.js).
Since that domain doesn't route Shopify's native cart paths, `shop.js`
rewrites the checkout URL's host to `blue2me.myshopify.com` before redirecting.

> **Note:** Shopify auto-redirects any non-primary domain back to the primary
> domain. The long-term solution is a dedicated checkout subdomain
> (e.g. `shop.blue2me.com`) pointed at `shops.myshopify.com` via CNAME and
> set as primary in Shopify. Until that's in place, the landing will not
> successfully complete checkouts.

## Data Flow

```
Customer
   |
   v
fischbox.blue2me.com          (Vercel CDN, static HTML)
   |
   | GraphQL (product query, cart mutations)
   v
blue2me.myshopify.com/api     (Shopify Storefront API)
   |
   | returns checkoutUrl
   v
shop.blue2me.com              (Shopify-hosted checkout, dedicated subdomain)
   |
   | order created
   v
Shopify Admin                 (order fulfilled, payment captured)
```

## Requirements in Shopify

The product "Blue2Me Starter Box" must be:
- Status: **Active** (not Draft)
- Published to the **Blue2me Headless** sales channel (required for Storefront API)
- Published to the **Online Store** channel (required for checkout infrastructure)
- Either have stock > 0 **or** "Continue selling when out of stock" enabled

The Storefront API token must have these scopes:
- `unauthenticated_read_product_listings`
- `unauthenticated_read_product_inventory`
- `unauthenticated_read_selling_plans`
- `unauthenticated_read_checkouts`
- `unauthenticated_write_checkouts`

## What Is NOT Included

- No analytics (add GA4 / GTM / Meta Pixel as needed before launch)
- No newsletter integration (Klaviyo / Brevo endpoint to be added in `config.js`)
- No A/B testing framework
- No customer accounts / login (checkout runs as guest by default)
- No server-side code — everything runs client-side or on Shopify

## Security

- Public Storefront token only (never expose the private `shpat_*` token)
- HTTPS enforced by Vercel
- Security headers set in `vercel.json`: `X-Content-Type-Options`,
  `Referrer-Policy`, `X-Frame-Options`
- No PII stored on our side; checkout happens entirely on Shopify
