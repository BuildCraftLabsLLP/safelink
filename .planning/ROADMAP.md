# Roadmap: SafeLink India

**Project:** SafeLink India (safelink.serverlord.in)
**Depth:** Quick (4 phases)
**Total v1 requirements:** 46
**All requirements mapped:** Yes

---

## Phase 1: Foundation & English Site

**Goal:** A fully working English-only version of SafeLink India deployed to Cloudflare Pages — all pages, all content, all 36 states, ~750 districts, major cities.

**Requirements:**
NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06 (English only),
CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, CONT-08, CONT-09,
AID-01, AID-02, AID-03, AID-04, AID-05,
PERF-01, PERF-02, PERF-03,
TECH-01, TECH-02, TECH-04, TECH-05,
A11Y-01, A11Y-02

**Success Criteria:**
1. `python build.py` generates the `dist/` directory with all English pages in under 3 minutes
2. Homepage loads at safelink.serverlord.in and displays 112 and other national emergency numbers
3. Every state page exists and shows at least one state-specific disaster helpline
4. Every district page exists with a heading and at least helpline placeholder
5. All 5 disaster guide pages (cyclone, flood, earthquake, heatwave, landslide) are accessible at `/guide/{type}/`
6. Every page is under 15KB (verified by build script check)
7. Language switcher links render on every page (even though non-English pages don't exist yet)

**Status:** Complete ✓
**Completed:** 2026-03-15
**Deployment:** https://safelink-india.pages.dev/

**Plans:** 4 plans
Plans:
- [x] 01-01-PLAN.md — Data pipeline: states, districts, cities, emergency numbers, guides, content JSON
- [x] 01-02-PLAN.md — Build system: Python/Jinja2 script + all templates
- [x] 01-03-PLAN.md — Content integration: full build, requirement validation, Puppeteer testing
- [x] 01-04-PLAN.md — Cloudflare Pages deployment + custom domain

---

## Phase 2: Multi-Language (10 Languages)

**Goal:** Every page from Phase 1 is available in all 10 languages via URL prefix routing, with correct script rendering and ASCII phone numbers.

**Requirements:**
I18N-01, I18N-02, I18N-03, I18N-04, I18N-05, I18N-06, I18N-07, I18N-08, I18N-09, I18N-10, I18N-11, I18N-12

**Success Criteria:**
1. `/hi/` homepage loads in Hindi with Devanagari script rendering correctly (no clipped vowel marks)
2. `/ta/` state page for Tamil Nadu renders in Tamil script with line-height 1.6+
3. Phone numbers on all language pages show ASCII digits (e.g., `112` not `११२`)
4. `<html lang="hi">` (and equivalent) set correctly on every translated page
5. Language switcher on any page navigates to the same page in the selected language
6. Build generates all ~10,000 language-variant HTML files and total file count stays under 20,000
7. A spot-check of 3 languages by a native/tool confirms emergency instructions are correctly translated

**Plans:** 4 plans
Plans:
- [ ] 02-01-PLAN.md — UI string translations (en.json + 9 languages) and state name translations
- [ ] 02-02-PLAN.md — Guide and content page translations (9 languages x 10 source files = 90 files)
- [ ] 02-03-PLAN.md — Build system i18n integration + template updates + script rendering CSS
- [ ] 02-04-PLAN.md — Validation, Puppeteer i18n tests, and human verification

---

## Phase 3: Live Alert Banner

**Goal:** A Cloudflare Worker fetches NDMA SACHET + IMD alerts, caches them in KV, and serves them to the alert banner on every homepage and state page.

**Requirements:**
ALERT-01, ALERT-02, ALERT-03, ALERT-04, TECH-03

**Success Criteria:**
1. `GET /api/alerts?state=mh` returns JSON with current alerts (or empty array) in under 500ms
2. If SACHET and IMD are both unreachable, Worker returns `{"alerts": [], "error": "unavailable"}` with 200 status (no 500s)
3. Alert banner appears on Maharashtra state page when a test alert is seeded into KV
4. Alert banner is absent (not broken) when no active alerts
5. Alert timestamp shows "Alerts as of: [time]" with the correct cache time
6. Worker KV cache is populated — second request returns cached response (verify via cache-hit header)

**Plans:**
1. Cloudflare Worker — fetch SACHET CAP/RSS + IMD API, normalize to common schema, KV caching
2. Alert banner UI — minimal JS snippet on state/home pages to fetch /api/alerts and render banner

---

## Phase 4: PWA, SEO & Launch Polish

**Goal:** Site is installable as a PWA, works offline for visited pages, passes SEO requirements, and is ready for public launch.

**Requirements:**
PWA-01, PWA-02, PWA-03, PWA-04, PWA-05,
SEO-01, SEO-02, SEO-03

**Success Criteria:**
1. Chrome on Android shows "Add to Home Screen" prompt for safelink.serverlord.in
2. After visiting the Maharashtra page online, turning off WiFi and navigating to it still shows the page
3. Alert banner shows "You are offline" when device has no network connection
4. `sitemap.xml` exists at `/sitemap.xml` and contains URLs for all 10,000+ pages
5. Every page has `<link rel="alternate" hreflang="hi" href="...">` tags for all 10 language variants
6. Lighthouse PWA score >= 90 on homepage
7. Page load on simulated 2G (Lighthouse throttling) under 3 seconds for homepage

**Plans:**
1. PWA — manifest.json, sw.js (stale-while-revalidate for HTML, network-first for alerts, offline indicator)
2. SEO — hreflang tags in build pipeline, sitemap.xml generation, geo.region meta tags
3. Launch checklist — Lighthouse audit, 2G load test, mobile check across 3 languages, disclaimer/about review

---

## Requirement Coverage

| Phase | Requirements | Count |
|-------|-------------|-------|
| Phase 1 | NAV-01..06, CONT-01..09, AID-01..05, PERF-01..03, TECH-01,02,04,05, A11Y-01,02 | 31 |
| Phase 2 | I18N-01..12 | 12 |
| Phase 3 | ALERT-01..04, TECH-03 | 5 |
| Phase 4 | PWA-01..05, SEO-01..03 | 8 |
| **Total** | | **56** (includes some TECH reqs shared) |

All 46 unique v1 requirements covered.

---
*Roadmap created: 2026-03-12*
*Plans created: 2026-03-12*
*Phase 1 complete: 2026-03-15*
*Phase 2 planned: 2026-03-15*
*Milestone: v1 -- Public launch*
