---
title: "Help Center Branding & Customization"
description: Customizing customer-facing Help Center identity, logos, hero banners, accent colors, and Enterprise white-labeling.
---

Salamandr allows administrators to customize the public Help Center portal to match your corporate identity, ensuring a seamless support experience for your customers.

---

## 1. Configurable Branding Settings

Navigate to **Admin Panel &rarr; Settings &rarr; Branding**:

- **Site Title (`site_title`):** The browser tab and header title for the customer Help Center (e.g. *Saint Jude Clinical Support*).
- **Hero Title (`hero_title`):** The main prominent greeting on the Help Center homepage (e.g. *How can we help you today?*).
- **Hero Tagline (`hero_tagline`):** Subtitle below the hero search bar (e.g. *Search our medical device runbooks, clinical SOPs, and user guides*).
- **Accent Color (`accent_color`):** Hex color code (e.g. `#E8890B` or `#0066CC`) applied to buttons, links, active indicators, and category icons.
- **Brand Logo (`logo_image_id`):** Uploaded corporate logo rendered in the header navigation bar.
- **White-Labeling (`hide_powered_by` - Enterprise):** Completely removes the *"Powered by Salamandr"* attribution footer across all public customer pages.

---

## 2. Public vs. Authenticated Endpoints

- **Public Endpoint (`GET /branding/public`):** Used by unauthenticated visitors loading the customer Help Center to fetch the site title, hero texts, accent color, and logo image without requiring session credentials.
- **Admin Endpoint (`GET / PATCH /branding`):** Restricted to authenticated administrators for modifying tenant branding.

---

## 3. REST API Reference

### Get Current Branding Settings
```http
GET /api/v1/branding
Authorization: Bearer <API_TOKEN>
```

**Response (`200 OK`):**
```json
{
  "site_title": "Saint Jude Clinical Help Center",
  "hero_title": "Medical Equipment & Telemetry Support",
  "hero_tagline": "Search our runbooks or submit a clinical incident ticket",
  "accent_color": "#E8890B",
  "logo_image_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "hide_powered_by": true,
  "can_hide_powered_by": true
}
```

### Update Branding Settings
```http
PATCH /api/v1/branding
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "site_title": "Saint Jude Clinical Help Center",
  "hero_title": "Medical Equipment & Telemetry Support",
  "hero_tagline": "Search our runbooks or submit a clinical incident ticket",
  "accent_color": "#E8890B",
  "logo_image_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "hide_powered_by": true
}
```

---

## 4. Reverse Proxy & Custom Subdomain

To point your Help Center to `support.yourcompany.com`, configure a CNAME record pointing to your Salamandr server, and configure your reverse proxy (Caddy / Nginx) to forward traffic to Salamandr.
