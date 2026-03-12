---
phase: 01-foundation-english-site
plan: 02
subsystem: build-system
tags: [python, jinja2, static-site-generator, templates]
dependency-graph:
  requires: []
  provides: [build-pipeline, html-templates, page-rendering]
  affects: [01-03-content-pages, 02-multi-language]
tech-stack:
  added: [jinja2, python-slugify]
  patterns: [template-inheritance, inline-styles, macro-includes]
key-files:
  created:
    - build.py
    - requirements.txt
    - .gitignore
    - templates/base.html
    - templates/home.html
    - templates/state.html
    - templates/district.html
    - templates/city.html
    - templates/guide.html
    - templates/static_page.html
    - templates/macros/emergency_bar.html
    - templates/macros/breadcrumb.html
    - templates/macros/language_switcher.html
  modified: []
decisions:
  - id: BUILD-01
    decision: "Jinja2 trim_blocks and lstrip_blocks enabled for minimal HTML output"
    context: "Pages must stay under 15KB for 2G performance"
  - id: BUILD-02
    decision: "All styles inline on elements, zero external CSS or style blocks"
    context: "Matches safe-now.live reference pattern, eliminates render-blocking CSS"
  - id: BUILD-03
    decision: "Language switcher uses HTML entities for non-Latin script names"
    context: "Ensures correct rendering in UTF-8 without relying on font availability"
metrics:
  duration: "5m 1s"
  completed: "2026-03-13"
---

# Phase 01 Plan 02: Build System Summary

Python/Jinja2 static site generator with 10 templates, inline styles, tel: links, 15KB page-size enforcement, and build-time data validation.

## What Was Built

### build.py - Static Site Generator
- Loads all JSON data from `data/` directory (states, districts, cities, emergency numbers, guides, content pages)
- Validates data integrity at build start: cross-references state codes in districts/cities, checks required files
- Renders 6 page types: homepage, state pages (36), district pages (750+), city pages (200+), guide pages (5), static pages (5)
- Enforces page size limits: FATAL at 15KB (15,360 bytes), WARNING at 12KB (12,288 bytes)
- Passes `current_path` and `current_lang` to every template for language switcher URLs
- Prints build summary with page count, total size, average size, and build time
- Clean exit codes: 0 for success, 1 for validation or size limit failures

### Templates (10 files)
- **base.html**: Master template with skip-to-content link, emergency bar, disclaimer bar, footer with site links, language switcher. Body styled with system-ui font stack, max-width 45em, 0.75rem padding.
- **home.html**: States/UTs list (sorted alphabetically), quick reference box (earthquake/cyclone/flood/fire/gas), disaster guide links, mental health helplines (iCall, Vandrevala), government resources (PM CARES, NDMA, NDRF, SACHET).
- **state.html**: Breadcrumb, state-specific emergency numbers (disaster helpline, SEOC, WhatsApp, etc.), quick reference, districts and cities as link lists, SDMA/NDMA/PM CARES resources, last-verified date.
- **district.html**: Breadcrumb (Home > State > District), emergency numbers, district HQ info, back-to-state link, NDMA/NDRF contacts.
- **city.html**: Breadcrumb (Home > State > City), emergency numbers, population rank, back-to-state link, NDMA/NDRF contacts.
- **guide.html**: Breadcrumb, subtitle, sections with bulleted items, highlighted emergency actions box (red), India-specific notes, links to other guides.
- **static_page.html**: Breadcrumb, title/subtitle, sections rendered as bullet lists (if `items`) or paragraphs (if `content`).
- **macros/emergency_bar.html**: Blue bar with 112 Emergency, 100 Police, 101 Fire, 108 Ambulance, 1070 Disaster.
- **macros/breadcrumb.html**: Reusable breadcrumb macro accepting items list with url/label pairs.
- **macros/language_switcher.html**: 10-language switcher (en, hi, ta, te, bn, mr, kn, ml, gu, pa) with current language bolded and others linked.

### Supporting Files
- **requirements.txt**: jinja2>=3.1, python-slugify>=8.0
- **.gitignore**: dist/, __pycache__/, *.pyc, .DS_Store, node_modules/, .env

## Verification Results

```
PASS: build.py compiles (python -m py_compile build.py)
PASS: pip install -r requirements.txt
PASS: All templates parse OK (base, home, state, district, city, guide, static_page)
PASS: All macros parse OK (emergency_bar, breadcrumb, language_switcher)
PASS: No <style> blocks in any template
PASS: 36 tel: link instances across templates
PASS: Test render of home.html produced 3,869 bytes (well under 15KB)
```

NOTE: Full end-to-end build (`python build.py`) will be verified in Plan 03 once data files from Plan 01 are available.

## Commits

| Task | Description | Commit | Key Files |
|------|-------------|--------|-----------|
| 1 | Build system and requirements | `1611553` | build.py, requirements.txt, .gitignore |
| 2 | All Jinja2 templates | `6e75372` | templates/ (7 main + 3 macros) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Git CLI unavailable due to Xcode license**
- **Found during:** Setup
- **Issue:** System git (/usr/bin/git) requires Xcode license agreement which cannot be accepted without sudo
- **Fix:** Installed dulwich (pure Python git library) and used dulwich.porcelain for all git operations
- **Impact:** Commits use a generic author identity; will normalize once system git is available

**2. [Rule 3 - Blocking] Language switcher HTML entities for non-Latin scripts**
- **Found during:** Task 2 (language_switcher.html)
- **Issue:** Direct Unicode characters in templates could cause encoding issues in some editors/contexts
- **Fix:** Used HTML numeric entities for Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati, Punjabi script names
- **Impact:** None - renders identically in browsers

## Decisions Made

| ID | Decision | Context |
|----|----------|---------|
| BUILD-01 | Jinja2 trim_blocks and lstrip_blocks enabled | Reduces whitespace in generated HTML for smaller pages |
| BUILD-02 | All styles inline, zero external CSS | Matches safe-now.live pattern, no render-blocking resources |
| BUILD-03 | HTML entities for non-Latin scripts in language switcher | Reliable rendering regardless of file encoding context |

## Next Phase Readiness

Build system is fully ready. Once Plan 01 completes data files (districts.json, cities.json, emergency_numbers.json, guides, content), Plan 03 can run `python build.py` to generate the full site.
