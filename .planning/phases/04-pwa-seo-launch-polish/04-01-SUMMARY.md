---
phase: 04-pwa-seo-launch-polish
plan: "01"
subsystem: pwa
tags: [pwa, service-worker, manifest, icons, robots, offline, caching]

# Dependency graph
requires:
  - phase: 01-foundation-english-site
    provides: "Build system and static site structure"
provides:
  - "PWA manifest (manifest.json) for installability"
  - "Service worker (sw.js) with offline caching"
  - "PWA icons (192x192 and 512x512 PNGs)"
  - "robots.txt with sitemap reference"
  - "Icon generator script (scripts/gen_icons.py)"
affects: [04-03, 04-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stale-while-revalidate caching for HTML pages"
    - "Network-first caching for API requests"
    - "Stdlib PNG generation with Pillow fallback"

key-files:
  created:
    - static/manifest.json
    - static/sw.js
    - static/robots.txt
    - static/icon-192.png
    - static/icon-512.png
    - scripts/gen_icons.py
  modified: []

key-decisions:
  - "PWA-01: Used Pillow for icon generation (available in env), with stdlib fallback path preserved"
  - "PWA-02: Service worker uses stale-while-revalidate for HTML with 24h freshness / 7d lifetime"
  - "PWA-03: API requests use network-first with empty JSON fallback ({alerts:[], cached:true})"
  - "PWA-04: No asset caching in SW since all styles are inline"

patterns-established:
  - "SW cache versioning via CACHE_NAME constant (safelink-v1)"
  - "sw-fetched-on header for time-based cache freshness"

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 4 Plan 01: PWA Static Assets Summary

**PWA manifest, service worker with stale-while-revalidate/network-first caching, saffron-branded PNG icons, and robots.txt for SEO**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T18:02:49Z
- **Completed:** 2026-03-20T18:05:28Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments
- Created PWA web app manifest with standalone display, shortcuts, and icon references
- Built service worker with three-tier caching: precache homepage, stale-while-revalidate for HTML, network-first for /api/*
- Generated saffron (#FF9933) branded PNG icons at 192x192 and 512x512 with white "SL" text
- Created robots.txt allowing all crawlers with sitemap reference to safelink.serverlord.in

## Task Commits

Each task was committed atomically:

1. **Task 1: Create icon PNG files via Python stdlib generator** - `0414434` (feat)
2. **Task 2: Create manifest.json, sw.js, and robots.txt** - `47aff34` (feat)

## Files Created/Modified
- `scripts/gen_icons.py` - PNG icon generator (Pillow with stdlib fallback)
- `static/icon-192.png` - 192x192 PWA icon (2,670 bytes)
- `static/icon-512.png` - 512x512 PWA icon (7,574 bytes)
- `static/manifest.json` - PWA manifest with name, icons, shortcuts, theme color
- `static/sw.js` - Service worker with install/activate/fetch event handlers
- `static/robots.txt` - Crawler rules with sitemap URL

## Decisions Made
- **PWA-01:** Used Pillow for icon generation since it's available, but kept stdlib fallback path in gen_icons.py for portability
- **PWA-02:** Service worker implements 24-hour freshness window (serve from cache without network) and 7-day maximum lifetime (evict after)
- **PWA-03:** API requests fall back to `{"alerts":[],"cached":true}` when both network and cache fail, allowing offline graceful degradation
- **PWA-04:** Non-navigate, non-API requests fall through to network without caching since all styles are inline per BUILD-02 decision

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed stray variable assignment in sw.js**
- **Found during:** Task 2 (service worker creation)
- **Issue:** `event = null` assignment in handleNavigationRequest was referencing undefined `event` variable
- **Fix:** Removed the unnecessary line; the function doesn't need the event object since it returns the cached response directly
- **Files modified:** static/sw.js
- **Verification:** Code review confirmed no variable reference issues
- **Committed in:** 47aff34 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor cleanup, no scope change.

## Issues Encountered
- Xcode license agreement required for system git; used `DEVELOPER_DIR=/Library/Developer/CommandLineTools` workaround (known issue from previous phases)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All static PWA assets ready in `static/` directory
- Plan 03 (build system integration) will need to copy static/ files to dist/ during build
- Plan 02 (template integration) will add `<link rel="manifest">` and SW registration script to templates
- Service worker registration will need to be added to base template HTML

---
*Phase: 04-pwa-seo-launch-polish*
*Completed: 2026-03-20*
