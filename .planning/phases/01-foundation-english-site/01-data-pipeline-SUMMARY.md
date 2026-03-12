---
phase: 01-foundation-english-site
plan: 01
subsystem: data
tags: [json, states, districts, cities, emergency-numbers, disaster-guides]
dependency-graph:
  requires: []
  provides: [states-data, districts-data, cities-data, emergency-numbers, disaster-guides, content-pages-data]
  affects: [01-03-content-pages, 01-04-deployment, 02-multi-language]
tech-stack:
  added: []
  patterns: [json-data-layer, slug-based-routing, state-code-foreign-keys]
key-files:
  created:
    - data/states.json
    - data/districts.json
    - data/cities.json
    - data/emergency_numbers.json
    - data/guides/cyclone.json
    - data/guides/flood.json
    - data/guides/earthquake.json
    - data/guides/heatwave.json
    - data/guides/landslide.json
    - data/content/firstaid.json
    - data/content/kit.json
    - data/content/recovery.json
    - data/content/about.json
    - data/content/disclaimer.json
  modified: []
decisions:
  - id: DATA-01
    decision: "state_code used as foreign key in districts and cities, matching states.json code field"
    context: "Enables referential integrity validation and efficient lookups"
  - id: DATA-02
    decision: "786 districts generated covering all 36 states/UTs"
    context: "Exceeds 750 minimum; counts match latest Indian district reorganizations"
  - id: DATA-03
    decision: "225 cities generated covering every state/UT capital plus major population centers"
    context: "Exceeds 200 minimum; includes all metros, state capitals, and significant tier-2/3 cities"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-13"
---

# Phase 01 Plan 01: Data Pipeline Summary

All 14 JSON data files created and validated. 36 states/UTs, 786 districts, 225 cities, national + 36-state emergency numbers, 5 disaster guides, 5 content pages.

## What Was Built

The complete data foundation for SafeLink India's static site generator. These 14 JSON files are consumed by the build system (build.py) to generate approximately 1,000 HTML pages covering every Indian state, district, and major city with emergency information.

### Deliverables

| File | Contents | Count/Size |
|------|----------|------------|
| `data/states.json` | All Indian states and UTs with codes, slugs, capitals, SDMA URLs, common disasters | 36 entries |
| `data/districts.json` | All Indian districts with state_code foreign keys | 786 entries |
| `data/cities.json` | Major Indian cities with population rankings | 225 entries |
| `data/emergency_numbers.json` | National emergency numbers + state-specific entries | 16 national + 36 state entries |
| `data/guides/cyclone.json` | Cyclone safety guide with India-specific content | 3 sections |
| `data/guides/flood.json` | Flood safety guide with India-specific content | 3 sections |
| `data/guides/earthquake.json` | Earthquake safety guide with seismic zone info | 3 sections |
| `data/guides/heatwave.json` | Heatwave safety guide with heat stroke signs | 3 sections |
| `data/guides/landslide.json` | Landslide safety guide with warning signs | 3 sections |
| `data/content/firstaid.json` | First aid reference (CPR, bleeding, burns, snake bite) | 6 sections |
| `data/content/kit.json` | Emergency kit checklist (India-specific items) | 7 sections |
| `data/content/recovery.json` | Post-disaster recovery guide | 5 sections |
| `data/content/about.json` | About SafeLink India page content | 5 sections |
| `data/content/disclaimer.json` | Legal disclaimer content | 4 sections |

### Data Integrity

- All district `state_code` values validated against `states.json`
- All city `state_code` values validated against `states.json`
- All 36 state codes present in `emergency_numbers.json`
- No duplicate codes or slugs in any file
- All JSON files parse without errors

## Validation Results

```
ALL PASS: 36 states, 786 districts, 225 cities, 36 state emergency entries, 5 guides, 5 content files
```

- states.json: 36 entries (28 states + 8 UTs), no duplicate codes or slugs
- districts.json: 786 entries, all state_codes valid
- cities.json: 225 entries, all state_codes valid
- emergency_numbers.json: 16 national numbers + 36 state-specific entries
- 5 guide files: each with 3+ sections, 7+ items per section
- 5 content files: structured for template rendering

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| DATA-01 | `state_code` used as foreign key linking districts/cities to states | Enables cross-file validation and efficient data lookups in build system |
| DATA-02 | 786 districts (exceeds 750 minimum) | Reflects latest Indian district reorganizations including new districts in Rajasthan, Chhattisgarh, and other states |
| DATA-03 | 225 cities (exceeds 200 minimum) | Covers every state/UT capital, all metro cities, and significant tier-2/3 population centers |

## Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create states.json with all 36 states/UTs | `5297a34` | data/states.json |
| 2 | Create districts, cities, emergency numbers | `7e032bf` | data/districts.json, data/cities.json, data/emergency_numbers.json |
| 3 | Create disaster guide and content JSON files | `5e2bab9` | 5 guide files + 5 content files |

## Next Phase Readiness

Plan 01-01 (Data Pipeline) and Plan 01-02 (Build System) are both complete. Plan 01-03 (Content Pages) can now proceed -- it depends on both plans and has all required data files and templates available.
