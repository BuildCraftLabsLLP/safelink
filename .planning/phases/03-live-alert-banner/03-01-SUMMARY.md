# Plan Summary: 03-01 Cloudflare Pages Function

**Plan:** 03-01
**Phase:** 03-live-alert-banner
**Completed:** 2026-03-18
**Duration:** ~2 hours
**Status:** COMPLETE

---

## What Was Built

Cloudflare Pages Function at `functions/api/alerts.js` serving the `/api/alerts` endpoint. Fetches NDMA SACHET all-India RSS feed, parses XML with fast-xml-parser, filters by state code, caches per-state results in Cloudflare KV with 15-minute TTL.

---

## Deliverables

| Artifact | Status | Notes |
|----------|--------|-------|
| `functions/api/alerts.js` | ✓ Created | 415 lines, ESM exports |
| `wrangler.toml` | ✓ Created | KV binding with placeholder namespace ID |
| `package.json` / `package-lock.json` | ✓ Updated | fast-xml-parser 5.5.6 installed |

---

## Tasks Completed

| Task | Status | Commit |
|------|--------|--------|
| Task 1: Create Pages Function + wrangler.toml | ✓ Complete | 8427ed6 |
| Task 2: Local testing + KV seed verification | ✓ Complete | 8427ed6 |

---

## Verified Behaviors

| Check | Result |
|-------|--------|
| `GET /api/alerts` returns 200 with JSON alerts array | ✓ Verified — 20 live SACHET alerts |
| `GET /api/alerts?state=MH` filters to Maharashtra | ✓ Verified — 1 Maharashtra alert |
| `X-Cache: MISS` on first request | ✓ Verified |
| `X-Cache: HIT` on second request (cached) | ✓ Verified |
| `Content-Type: application/json` | ✓ Verified |
| `Access-Control-Allow-Origin: *` | ✓ Verified |
| Graceful degradation (always 200) | ✓ Coded — try/catch returns `{"alerts":[], "error":"unavailable"}` |

---

## Architecture

- **Entry:** `functions/api/alerts.js` at project root (auto-routed by Cloudflare Pages to `/api/alerts`)
- **Feed:** `https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml` (all-India, ~105 items)
- **Parser:** fast-xml-parser v5.5.6 (XMLParser with ignoreAttributes: false)
- **State filtering:** Matches state name in `source` (author field) or `headline` text
- **CAP enrichment:** Fetches individual CAP XML for ≤10 filtered items (gets severity, expires, cleaner headline)
- **Caching:** KV with 15-min TTL (CACHE_TTL=900), error responses cached 5 min (ERROR_CACHE_TTL=300)
- **Max alerts:** 20 per response (MAX_ALERTS)
- **Sorting:** Extreme=4 → Severe=3 → Moderate=2 → Minor=1 → Unknown=0 (descending)

---

## Decisions Made

| ID | Decision | Reason |
|----|----------|--------|
| ALERT-01 | Use all-India RSS feed (`rss_india.xml`), not state-specific feeds | State-specific feeds return 404 for multi-word state names |
| ALERT-02 | KV namespace ID left as PLACEHOLDER_NAMESPACE_ID in wrangler.toml | Real ID created during production deployment |
| ALERT-03 | CAP XML enrichment only for ≤10 filtered alerts | Prevents timeout on large result sets |
| ALERT-04 | Error responses cached at 5-min TTL | Avoids hammering downed SACHET server |

---

## Open Items for Deployment

- **KV Namespace:** Run `npx wrangler kv namespace create ALERTS_KV` to get real namespace ID, then update `wrangler.toml`
- **Production test:** After deploy, verify `GET https://safelink-india.pages.dev/api/alerts?state=MH` returns JSON

---

## Next Plan

Plan 03-02: Alert banner UI — modify build.py to add `data-state` attribute, inline JS snippet in base.html, rebuild 10,580 pages, Puppeteer tests, visual verification.
