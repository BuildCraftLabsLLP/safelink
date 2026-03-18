# Phase 4: PWA, SEO & Launch Polish - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the site installable as a PWA, work offline for visited pages, discoverable via SEO, and polished for public launch including custom domain go-live. Creating new content pages or new language support are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Offline experience
- Uncached pages on offline visit → browser default error (no custom fallback page)
- Pre-cache on SW install: homepage (`/`) + national emergency numbers page
- HTML pages cached lazily as visited (stale-while-revalidate); cache freshness duration → Claude's discretion
- HTML only cached — no separate asset caching (styles are inline, assets minimal)
- `/api/alerts` responses cached per state (supports "show last cached alert" behavior offline)
- Alert banner when offline: show last cached alert response if available, else hide banner entirely
- Cache expiry policy → Claude's discretion (prevent stale emergency info indefinitely)

### PWA install
- App name: **SafeLink India**
- Display mode: **standalone** (no browser UI when launched from home screen)
- Theme color / splash: **#FF9933** (India saffron/orange)
- Icon: Claude generates a simple SVG-based icon (shield or link symbol, saffron + white)
- start_url: `/` (English homepage)
- App shortcuts (long-press): homepage + national emergency numbers page

### SEO & sitemap
- Sitemap structure: Claude's discretion (single file vs sitemap index based on URL count)
- Pages included in sitemap: Claude's discretion (balance crawlability vs file size)
- hreflang tags: Claude's discretion (balance SEO completeness vs per-page byte cost)
- Canonical URLs: each language page is canonical to itself (standard multilingual SEO practice)
- Open Graph tags: **No** — not worth the bytes for an emergency utility
- Structured data (JSON-LD / EmergencyService schema): Claude's discretion
- geo.region meta tags: include as planned in roadmap

### Launch readiness
- Lighthouse PWA score gate: **≥ 90** (hard requirement, not flexible)
- Custom domain **safelink.serverlord.in must be live before launch** — pages.dev is pre-launch only
- Puppeteer tests run against pages.dev URL — domain config is ops, not code
- Mobile testing bar: Claude's discretion (Hindi + Tamil minimum; Urdu RTL if time allows)
- About page: **required before launch** — full content: mission, team, data sources, disclaimer, contact + error reporting

### About page content
- Mission: what SafeLink India is and why it exists
- Team: who built it
- Data sources: SACHET, IMD, NDMA, state government portals
- Disclaimer: numbers may be outdated; verify via official sources during an emergency
- Contact: how to report errors or contribute corrections

### Claude's Discretion
- SW cache freshness duration for HTML pages
- SW cache expiry / max-age policy
- Sitemap structure (single file vs index)
- Which pages get hreflang tags
- Which pages included in sitemap
- Structured data inclusion
- Mobile language testing selection (beyond Hindi + Tamil)

</decisions>

<specifics>
## Specific Ideas

- Saffron (#FF9933) as PWA theme color — matches the India identity
- App shortcuts on long-press: two shortcuts (homepage + emergency numbers page)
- About page must be honest: data may be out of date, users should verify during real emergencies
- Tests remain on pages.dev URL — domain is a DNS/Cloudflare ops task, not a code concern

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-pwa-seo-launch-polish*
*Context gathered: 2026-03-19*
