# Salamandr website

The public marketing site: landing page, helpdesk comparisons, and the getting-started docs.
Built with [Astro](https://astro.build) + [Starlight](https://starlight.astro.build) (docs
only) + Tailwind. Separate from `backend/` and `frontend/` — this is the app itself; this is
what tries to get someone to install it.

## Editing content

Almost everything a marketer or founder would want to change lives in Markdown, not code:

- **Comparison pages** (`/compare/zendesk`, `/compare/freshdesk`, ...) — one file per
  competitor in `src/content/comparisons/*.md`. Frontmatter holds the feature-comparison
  table; the Markdown body below it is the "verdict" prose at the bottom of the page. Add a
  new competitor by adding a new file here — `/compare/` picks it up automatically, sorted by
  the `order` field.
- **Industries page** (`/industries/`) — `src/content/industries/*.md` (one per industry,
  `whyFit` bullets should each name a real shipped feature, not an aspiration) and
  `src/content/case-studies/*.md`. The case-study files ship as **templates** (`placeholder:
  true`, bracketed `[Company name]` text) — the page renders an amber "Template — not yet
  published" badge on any card with `placeholder: true`. Replace with a real customer's
  numbers and flip `placeholder: false` before publishing; don't invent a name or a metric.
- **Docs** (`/docs/*`) — `src/content/docs/docs/*.md`. Standard Starlight frontmatter
  (`title`, `description`). Add a page to the sidebar in `astro.config.mjs`'s
  `starlight({ sidebar: [...] })` block.
- **Landing page copy** (hero, pillars, channels, editions, pricing) — currently inline arrays
  at the top of `src/pages/index.astro` rather than Markdown, since it's tightly laid out
  rather than prose. Edit the arrays; the layout below reads from them.
- **Site-wide links** (GitHub URL, docs entry point) — `src/consts.ts`.

## Structure

```
src/
├── content.config.ts       # collection schemas (comparisons, industries, case studies, docs)
├── content/
│   ├── comparisons/        # one .md per competitor
│   ├── industries/         # one .md per industry, rendered as cards on /industries/
│   ├── case-studies/       # placeholder templates — see "Before going live" below
│   └── docs/docs/          # nested one level so Starlight routes land on /docs/*
├── components/              # SiteHeader, SiteFooter (marketing chrome)
├── layouts/
│   └── MarketingLayout.astro
├── pages/
│   ├── index.astro          # landing page
│   ├── industries/
│   │   └── index.astro      # industries + case studies, built from the content collections
│   └── compare/
│       ├── index.astro      # comparison list, built from the content collection
│       └── [slug].astro     # comparison detail page
└── styles/
    ├── global.css            # Tailwind entry + typography plugin
    └── starlight-overrides.css  # brand color tokens for the docs theme
```

Docs pages are nested under `src/content/docs/docs/` (not `src/content/docs/`) on purpose —
Starlight's docs collection maps a file's path under `src/content/docs/` directly to its URL,
so the extra `docs/` folder is what makes those routes land at `/docs/*` instead of `/*`,
leaving `/`, `/compare/*`, etc. free for the plain Astro pages above.

## Commands

```sh
npm install
npm run dev       # localhost:4321
npm run build     # -> dist/, the real correctness check (catches broken content refs)
npm run preview   # serve the production build locally
```

## Before going live

- `astro.config.mjs`'s `site` and the GitHub URLs in `src/consts.ts` are placeholders —
  point them at the real domain and repository.
- `public/favicon.svg` / `favicon.ico` are Astro's stock icon; swap for real branding.
- Pricing figures on the landing page and in `docs/enterprise-licensing.md` are the anchors
  from the repo's `docs/pricing.md` — confirm they're still the numbers you want live before
  publishing.
- `src/content/case-studies/*.md` are placeholder templates (`[Company name]`, bracketed
  filler text) — replace with real customers before launch, or drop the files and the "Case
  studies" section on `/industries/` renders empty rather than erroring.
