# blue2me Fischbox — Standalone Landing

Statische Landingpage für blue2me, die über das **Shopify Storefront API** Bestellungen direkt im Shopify-Checkout abschließt. Kein Theme nötig.

## Architektur

```
[Customer]
   ↓
[fischbox.blue2me.com — Static HTML auf Vercel]
   ↓ (Klick auf "Jetzt sichern")
[Shopify Storefront API → Checkout-URL]
   ↓
[checkout.shopify.com / dein.myshopify.com Checkout]
   ↓
[Bestellung erscheint in Shopify Admin]
```

## Setup in 4 Schritten

### Schritt 1 — Storefront API Token in Shopify erstellen

1. Shopify Admin → **Settings → Apps and sales channels → Develop apps**
2. **"Allow custom app development"** aktivieren (falls noch nicht)
3. **"Create an app"** → Name z.B. *"Blue2Me Landing"*
4. Tab **"Configuration"** → Unter **"Storefront API access"** auf "Configure" klicken
5. Alle "Storefront API access scopes" aktivieren — vor allem:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory`
   - `unauthenticated_write_checkouts`
   - `unauthenticated_read_checkouts`
6. **Save** → **Install app**
7. Tab **"API credentials"** → unter "Storefront API access token" → **Token kopieren**

### Schritt 2 — Variant-IDs deiner Produkte holen

1. Shopify Admin → **Products** → dein Produkt öffnen (z.B. "Probierbox")
2. Wenn das Produkt nur eine Variante hat: Scroll runter zu **"Variants"** → die einzige Zeile rechtsklicken → **"Inspect"** im Browser
3. Im DevTools nach `ProductVariant` suchen → die letzten Zahlen sind die Variant-ID
4. **Schneller**: Im URL-Bar die Produktseite öffnen, die URL endet auf `/admin/products/8123456789` — die Zahl ist die Product-ID, NICHT die Variant-ID
5. **Am einfachsten**: Im Shopify Admin auf "Edit" am Variant klicken, dann ist in der URL `/variants/49234567890123` — die letzte Zahl ist die **Variant-ID** (15-stellig)

### Schritt 3 — `assets/config.js` ausfüllen

Datei `assets/config.js` öffnen und ersetzen:

```js
window.BLUE2ME_CONFIG = {
  shopDomain: 'blue2me.myshopify.com',          // ← deine .myshopify.com Domain
  storefrontToken: 'shpat_xxxxxxxxxxxxxxxx',     // ← Token aus Schritt 1

  variants: {
    probierbox: '49234567890123',                // ← Variant-ID der Probierbox
    fischbox: '49234567890124'                   // ← Variant-ID der normalen Fischbox
  },

  newsletterEndpoint: ''  // optional
};
```

### Schritt 4 — Lokal testen

Datei `index.html` einfach im Browser öffnen — alle CTAs sollten funktionieren und nach Klick zum Shopify-Checkout weiterleiten.

---

## Deploy auf Vercel (kostenlos)

### Variante A — Drag & Drop (einfachster Weg, kein Git nötig)

1. https://vercel.com → Account erstellen / einloggen
2. **"Add New → Project"** → **"Import a Third-Party Git Repository"** überspringen
3. Den **`dist/`** Ordner als ZIP packen → bei Vercel hochladen
4. **Deploy** drücken
5. Du bekommst eine URL wie `blue2me-fischbox.vercel.app`

### Variante B — Mit Vercel CLI (schneller)

```bash
npm i -g vercel
cd C:\Users\Pasca\repos\Blue2Me\dist
vercel
```

Folge dem Wizard. Beim ersten Mal: Account verlinken, Project Name eingeben.

Updates pushen:
```bash
vercel --prod
```

---

## Custom Domain einrichten — `fischbox.blue2me.com`

1. **In Vercel:** Project → **Settings → Domains** → `fischbox.blue2me.com` hinzufügen
2. Vercel zeigt dir 2 DNS-Records die du setzen musst
3. **Bei deinem DNS-Provider** (wo blue2me.com gehostet ist — Cloudflare, IONOS, etc.):
   - **CNAME-Record** anlegen:
     - Host: `fischbox`
     - Value: `cname.vercel-dns.com`
4. 5 Minuten warten → SSL-Zertifikat wird automatisch von Vercel erstellt
5. `https://fischbox.blue2me.com` zeigt deine Landing

---

## Was funktioniert

| Element | Verhalten |
|---------|-----------|
| **Probierbox CTA** (3x: Hero, Probierbox-Section, finaler CTA-Banner) | Klick → Probierbox in den Cart → Shopify-Checkout |
| **Fischbox CTA** in Buy-Section "In den Warenkorb" | Klick → Fischbox in den Cart, Cart-Bubble updated, Toast erscheint |
| **Fischbox CTA** in Buy-Section "Direkt zum Checkout" | Klick → Fischbox in den Cart → sofort zum Shopify-Checkout |
| **Quantity-Stepper** (− / +) | Funktioniert und wird in den Cart übernommen |
| **Cart-Icon im Header** | Zeigt Anzahl Artikel im Cart, Klick → Shopify-Checkout |
| **Cart-Persistenz** | Checkout-ID in localStorage, Customer kann Tab schließen und kommt mit gefülltem Cart zurück |
| **FAQ Accordion** | Native HTML5 |
| **Mobile Hamburger** | Funktioniert |
| **Footer-Links zu blue2me.com** | Externe Links |

## Was du noch tun kannst

- **Newsletter-Endpoint** in `config.js` setzen (Klaviyo, Brevo, Mailchimp) — sonst geht das CTA-Banner nur als visuelles Element. Aktuell ist das CTA aber eh ein Buy-Now-Button geworden.
- **Hero-Bild ersetzen** durch ein echtes Foto: `assets/hero-box.jpg` überschreiben.
- **Echte Testimonials/Influencer-Avatare** in `assets/` reinlegen und in `index.html` referenzieren.

---

## Files

```
dist/
├── index.html              ← Production Landing
├── vercel.json             ← Vercel Deploy Config
├── README.md               ← Diese Datei
└── assets/
    ├── config.js           ← ⚠️  HIER deine Shopify-Daten eintragen
    ├── shop.js             ← Buy Button Logik
    ├── theme.js            ← UI Interaktionen (Mobile-Nav, Reveal, etc.)
    ├── global.css          ← Komplettes CSS
    ├── *.jpg / *.png       ← 23 Bilder
```

Total: ~4 MB unkomprimiert, ~1 MB nach Vercel Edge Compression.
