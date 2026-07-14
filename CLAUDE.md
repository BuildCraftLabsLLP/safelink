# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SafeLink India is a static emergency-information site: ~10,580 pre-rendered HTML pages (emergency numbers, disaster guides, live alerts) covering 36 states/UTs, 786 districts, 225 cities, in 10 languages. It is deployed to Cloudflare Pages at `safelink.buildcraft.town`. The overriding design constraint is **it must work on 2G** — this is why there are no CSS frameworks, no JS bundles, and only inline styles.

## Commands

```bash
# Build the site: data/ + templates/ -> dist/ (also generates sitemap.xml)
python build.py

# Build + inject security headers + deploy to Cloudflare Pages
./deploy.sh

# Local preview (serves dist/ with Pages Functions, i.e. /api/alerts works)
npx wrangler pages dev dist/

# End-to-end page tests (Puppeteer) — requires a server already running.
# Pass the base URL as argv[2]; defaults to http://localhost:8080
node test_pages.js http://localhost:8080

# Regenerate translated guides / content (writes into data/*_i18n/)
python scripts/gen_hi_guides.py        # one per language: gen_<lang>_guides.py
python scripts/gen_content_about.py    # one per content page: gen_content_<page>.py
```

Python deps: `pip install -r requirements.txt` (jinja2, python-slugify). Node deps: `npm install` (puppeteer for tests, fast-xml-parser for the alerts function).

## The hard build gate: page size

`build.py` **fails the build (`sys.exit(1)`)** if any page exceeds **15 KB (English)** or **20 KB (non-English)** — see `PAGE_FATAL_BYTES` / `PAGE_FATAL_BYTES_I18N` in `build.py`. A warning fires at 12 KB. This budget is the reason the whole site avoids external assets. Any template or content change must stay under budget; check the build's size warnings before deploying.

## Architecture

**Static generation (`build.py`)** is the core. It:
1. Loads and validates the data model from `data/*.json` (`states`, `districts`, `cities`, `emergency_numbers`), aborting on validation failure.
2. Loops over `LANGUAGES = ["en", "hi", "ta", "te", "bn", "mr", "kn", "ml", "gu", "pa"]`. English renders at the site root; every other language renders under a path prefix (`/hi/...`, `/ta/...`). This prefix convention drives URLs, the sitemap, and the `hreflang` tags in `templates/base.html`.
3. Renders Jinja2 templates in `templates/` (`home`, `state`, `district`, `city`, `guide`, `static_page`, all extending `base.html`) into `dist/`.
4. Copies everything in `static/` verbatim into `dist/` (this is how `robots.txt`, `llms.txt`, `manifest.json`, `sw.js`, icons, and the standalone `alerts.html` ship), then generates `sitemap.xml` covering every URL in every language.

**Translation layers** are separate JSON trees, all consumed by `build.py`:
- `data/i18n/<lang>.json` — UI strings (the `t()` function)
- `data/names_i18n/<lang>.json` — translated place names
- `data/content_i18n/<lang>/` and `data/guides_i18n/<lang>/` — translated prose for static pages and disaster guides
English content lives in `data/content/` and `data/guides/`. The `scripts/gen_*.py` generators produce the `*_i18n/` files — hand-editing generated translations will be overwritten on regeneration.

**Live alerts** are the only dynamic part. `functions/api/alerts.js` is a Cloudflare Pages Function at `/api/alerts`:
- Fetches the NDMA SACHET CAP RSS feed, parses it with `fast-xml-parser`, filters/sorts by severity, and optionally filters by `?state=<CODE>`.
- Caches results in the `ALERTS_KV` namespace (binding in `wrangler.toml`): 15 min for success, 5 min for errors.
- The client half is inline JS in `templates/base.html`: it reads `data-state` off `<body>`, fetches `/api/alerts`, and injects the top alert banner (capped at 3 alerts + overflow link). This is the one place JS is deliberately shipped.

**PWA / offline**: `static/sw.js` (service worker) + `static/manifest.json` make the site installable and available offline after first visit.

## Deployment topology

- **Cloudflare Pages project name is `safelink-india`** (in `wrangler.toml` and `deploy.sh`). This is the internal project ID and is intentionally *not* the same as the public domain — `safelink.buildcraft.town` is attached to that project as a custom domain. Don't rename the project when changing the domain.
- The production domain is hardcoded in two places that must stay in sync: `base_url` in `generate_sitemap()` (`build.py`) and the canonical/`hreflang` URLs in `templates/base.html` (plus `static/robots.txt`, `static/alerts.html`, `README.md`, `deploy.sh`, and the health-check URLs in `.github/workflows/uptime.yml`).
- `.github/workflows/uptime.yml` runs a cron that curls the homepage, `/api/alerts`, and `/hi/` for uptime monitoring.
- `dist/` is gitignored — it is a build artifact, never committed.

## Adding a language

Add the code to `LANGUAGES` in `build.py`, add a `LANG_CSS` entry (line-height + Noto font), then supply `data/i18n/<lang>.json`, `data/names_i18n/<lang>.json`, and the `content_i18n/`+`guides_i18n/` trees (typically via a new `scripts/gen_<lang>_guides.py`). The `hreflang` list in `templates/base.html` must also gain the new language.
