# Phase 2: Multi-Language (10 Languages) - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend all Phase 1 pages to render in 10 languages via URL prefix routing (/hi/, /ta/, etc.). Every page available in every language, correct script rendering, ASCII phone numbers, and a working language switcher. Creating new content or new page types is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Languages
- All 10 top Indian languages launched simultaneously (no staggered rollout)
- Languages: Hindi (hi), Bengali (bn), Telugu (te), Marathi (mr), Tamil (ta), Urdu (ur), Gujarati (gu), Kannada (kn), Malayalam (ml), Odia (or)

### Translation source
- AI-generated translations — not manual
- Translations pre-built as JSON files (one per language), rendered at build time
- When English source content changes, all 10 language versions auto-regenerate
- Review approach, back-translation passes, and emergency term handling (NDMA, state names, numerals): Claude's Discretion

### Language switcher
- Row of language abbreviations (HI, BN, TE, MR, TA, UR, GU, KN, ML, OR)
- Switching navigates to the same page in the selected language (not homepage)
- Currently active language is visually distinguished (required — not optional)
- Switcher placement and mobile behavior: Claude's Discretion (best practices)

### Fallback strategy
- Untranslated pages are hidden from the language switcher — not shown until ready
- If a page has no translation, full page content is replaced with a placeholder (not a banner over English)
- Fallback applies per full page, not per section
- Placeholder message: "This page is not yet available in [language]." (or equivalent in that language)

### Script & rendering
- Claude's Discretion — font choice, line-height, Devanagari/Tamil/Bengali rendering fixes, ASCII numeral enforcement

</decisions>

<specifics>
## Specific Ideas

- All 10 languages must go live together — partial language launches not acceptable
- Active language in switcher must be clearly marked (visually prominent, not subtle)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-multi-language*
*Context gathered: 2026-03-15*
