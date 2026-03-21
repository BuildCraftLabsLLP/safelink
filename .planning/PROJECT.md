# SafeLink India

## What This Is

SafeLink India (safelink.serverlord.in) is an ultra-light emergency information site for India — providing fast-loading (2G-ready) static HTML pages with emergency numbers, disaster guidance, government relief resources, and live alert banners. It covers all 28 states + 8 UTs, ~750 districts, and major cities in 10 Indian languages, deployed globally via Cloudflare Pages.

## Core Value

Anyone in India can reach critical emergency information within seconds on any connection, in their own language.

## Requirements

### Validated

- ✓ Emergency numbers page: national (112, 101, 102, 100, 108) + state-specific numbers — v1.0
- ✓ State pages for all 28 states + 8 Union Territories — v1.0 (36 state/UT pages)
- ✓ District-level pages (~750 districts) under each state — v1.0 (786 districts)
- ✓ City pages for major cities — v1.0 (225 cities)
- ✓ 10-language support: English, Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati, Punjabi — v1.0 (10,580 pages)
- ✓ Live disaster alert banner (NDMA SACHET) at top of pages — v1.0 (Cloudflare Worker + KV, 15-min TTL)
- ✓ Disaster-specific guide pages: cyclones, floods, earthquakes, heatwaves, landslides — v1.0
- ✓ Government scheme/relief links: PM CARES, state CM relief funds, NDRF contacts — v1.0
- ✓ PWA / offline-first: installable, cached for offline use after first load — v1.0
- ✓ Quick reference guides: what to do in each disaster type — v1.0
- ✓ Emergency kit checklist adapted for Indian context — v1.0
- ✓ Static core content + live alert layer via Cloudflare Workers — v1.0

### Active

- [ ] Language auto-detection via Accept-Language header (Cloudflare Worker redirect) — ENH-04
- [ ] Seasonal disaster calendar (visual, by region) — ENH-01
- [ ] Cyclone tracking link integration (IMD cyclone tracker) — ENH-02
- [ ] State portal links for live flood maps (NRSC/ISRO satellite data) — ENH-03
- [ ] User error reporting ("Report incorrect info" link) — ENH-05

### Out of Scope

- SMS fallback — significant infrastructure complexity, defer to future
- User accounts or personalization — not relevant for emergency info
- Mobile native apps — PWA covers offline use case without app store friction
- Paid content or ads — must remain free and fast
- Maps / embedded Google Maps — adds 100KB+, breaks 2G usability
- Video content — completely unusable on 2G
- Push notifications — complex permission flow, infra overhead

## Context

- **Current state:** v1.0 shipped 2026-03-21 — 10,580 pages, 10 languages, PWA, live SACHET alerts, SEO
- **Codebase:** ~6,540 LOC Python + JS + Jinja2; 14 JSON data files; 10 Jinja2 templates
- **Build:** `python build.py` → 10,580 HTML pages in ~4.4s
- **Deployment:** `./deploy.sh` → Cloudflare Pages (wrangler direct upload)
- **Live at:** https://safelink-india.pages.dev/ (custom domain safelink.serverlord.in pending DNS)
- **Tests:** 92 Puppeteer tests in test_pages.js — all passing
- **Tech debt (v2):** 5 items — see `.planning/milestones/v1.0-MILESTONE-AUDIT.md`
- **Target audience:** Anyone in India, especially disaster-prone regions (coastal states, Himalayan belt, river basins)
- **Connectivity constraint:** Pages under 15KB for 2G / slow connections (non-English: 20KB)

## Constraints

- **Performance**: Pages must load under 15KB — no CSS frameworks, no JavaScript bundles, inline styles only
- **Tech stack**: Static HTML generation (Python/Node script) + Cloudflare Pages deployment
- **Languages**: 10 languages live — translation infrastructure built-in
- **Data**: Live alerts via Cloudflare Worker that fetches/caches NDMA + IMD feeds every 15 minutes
- **Offline**: PWA service worker for offline-first; must work after first load without network

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static HTML over Next.js | Matches safe-now.live's 2G-first philosophy; no JS overhead | ✓ Good — pages average 3.6KB English, well under 15KB |
| Cloudflare Pages + Workers | Edge-cached globally, free tier, Workers handle live alert API fetching | ✓ Good — zero cold-start latency, free tier handles expected traffic |
| All 10 languages at launch | India's linguistic diversity is core to accessibility mission | ✓ Good — 10,580 pages across all Indic scripts |
| Hybrid static + live alerts | Static pages are fast and offline-capable; live banner adds real-time value without hurting perf | ✓ Good — 1,176-byte JS snippet, fails silently |
| Direct upload (wrangler) not Git integration | Decouples deployment from repo; no Cloudflare Git access needed | ✓ Good — deploy.sh is repeatable and simple |
| 20KB limit for non-English pages | Indic UTF-8 text is ~3× larger than English; 15KB too tight | ✓ Good — all non-English pages pass |
| All-India SACHET RSS feed | State-specific feeds return 404 for multi-word state names | ✓ Good — reliable single-feed approach |
| Stale-while-revalidate for SW | Balance offline capability and content freshness | ✓ Good — 24h freshness, 7d lifetime |

---
*Last updated: 2026-03-21 after v1.0 milestone*
