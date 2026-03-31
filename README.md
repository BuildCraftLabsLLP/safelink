# SafeLink India

**Emergency information for India — works on 2G.**

Live at: [safelink.serverlord.in](https://safelink.serverlord.in) · [safelink-india.pages.dev](https://safelink-india.pages.dev)

---

## What it does

SafeLink India provides fast-loading static pages with emergency numbers, disaster safety guides, and live NDMA alerts for every Indian state, district, and major city — in 10 languages.

- **36 states + UTs** · **786 districts** · **225 cities**
- **10 languages** — English, Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati, Punjabi
- **10,580 static HTML pages** averaging under 5KB
- **Live alerts** from NDMA SACHET via Cloudflare Worker (15-min cache)
- **PWA** — installable, works offline after first visit
- **2G-ready** — no CSS frameworks, no JS bundles, inline styles only

---

## Tech stack

| Layer | Tech |
|-------|------|
| Static site generator | Python + Jinja2 (`build.py`) |
| Hosting | Cloudflare Pages |
| Live alert API | Cloudflare Workers + KV |
| Data | JSON files in `data/` |
| Tests | Puppeteer (`test_pages.js`) |

---

## Project structure

```
data/
  states.json          # 36 states/UTs
  districts.json       # 786 districts
  cities.json          # 225 cities
  emergency_numbers.json
  guides/              # 5 disaster safety guides
  content/             # about, disclaimer, firstaid, kit, recovery
  i18n/                # UI strings (10 languages)
  names_i18n/          # State name translations (9 languages)
  guides_i18n/         # Guide translations (9 languages × 5 guides)
  content_i18n/        # Content page translations (9 languages × 5 pages)
templates/             # Jinja2 templates (7 page types + 3 macros)
functions/
  api/alerts.js        # Cloudflare Pages Function — NDMA SACHET alert API
static/                # PWA assets (manifest, sw.js, icons, robots.txt)
build.py               # Static site generator
deploy.sh              # Build + deploy script
test_pages.js          # Puppeteer test suite (92 tests)
```

---

## Running locally

```bash
pip install -r requirements.txt
python build.py
# Output in dist/
```

For live alert API locally:
```bash
npm install
npx wrangler pages dev dist/
```

---

## Deploying

```bash
./deploy.sh
# Runs: python build.py && npx wrangler pages deploy dist/ --project-name safelink-india
```

---

## Report an error

Found a wrong phone number, outdated helpline, or translation mistake? Email **atharva@serverlord.in** or [open an issue](https://github.com/serverl0rd/safelink/issues). Accurate information saves lives.

---

## License

MIT — free to use, adapt, and deploy for other countries or contexts.

Built by [Atharva Kulkarni](https://atharvakulkarni.link) / [ServerLord](https://serverlord.in).
