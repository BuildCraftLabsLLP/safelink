# Phase 3: Live Alert Banner - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a Cloudflare Worker that fetches NDMA SACHET + IMD alerts, normalises them to a common schema, and caches them in Cloudflare KV. Add a minimal JS snippet to every page that fetches the Worker endpoint and renders an alert banner. Creating new alert sources or editorial alert management is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Banner placement
- Banner appears **above the header** (very top of page, before `<h1>`)
- Only rendered when active alerts exist — no banner when data is unavailable or no alerts
- Banner appears on **all pages**: homepage, state, district, city, and guide pages

### Alert content
- Each alert shows: **headline + link to official source** (SACHET or IMD)
- All alerts are shown **stacked** (no collapse, no "show more") — most severe first
- Severity ordering: Worker normalises severity to a comparable value; JS renders in descending severity order

### Severity presentation
- Claude's Discretion — colour-coding, icons, or label approach. Should be visually distinct but not overwhelming on a minimal page.

### Alert language
- Alert content (headline, description) is **English only** on all pages, including regional language pages (/hi/, /ta/, etc.)
- UI chrome (labels, timestamps, status messages) is also **English only** — no additions to the i18n system for this phase

### Empty and offline states
- **No active alerts** → no banner (banner area absent entirely)
- **API/Worker unreachable** → no banner (fail silently)
- **Loading state** → Claude's Discretion (no layout shift preferred)

### State matching and alert scope
- Claude's Discretion for alert scope: show state-specific alerts + national/all-India alerts on state pages; homepage shows all national-level alerts
- State detection: build.py bakes state code into a `data-state` attribute or inline JS variable at build time — no runtime URL parsing
- District and city pages: pass their parent state code so they receive that state's alerts

### Caching
- Worker KV TTL: 15 minutes (aligns with REQUIREMENTS.md ALERT-02)
- Cache-hit header included in Worker response for verification

</decisions>

<specifics>
## Specific Ideas

- User explicitly wants to know when system is down — but then confirmed "nothing" is preferred. So the UI should not alarm users; simply don't show the banner rather than showing an error state. The Worker still returns `{"alerts": [], "error": "unavailable"}` (200 OK) per requirements, but the JS just renders nothing.
- All pages get the banner, including district/city pages — meaning the JS snippet and `data-state` attribute must be present in district.html and city.html templates too.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-live-alert-banner*
*Context gathered: 2026-03-17*
