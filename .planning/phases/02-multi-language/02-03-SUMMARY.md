# Plan 02-03: Build System i18n Integration - Summary

**Status:** Complete
**Completed:** 2026-03-16

## One-liner

build.py language loop over 10 languages with t()/url() translation functions, per-language CSS (font-family + line-height), and language switcher with compact labels

## What Was Built

### build.py Changes
- LANGUAGES list: en, hi, ta, te, bn, mr, kn, ml, gu, pa
- LANG_CSS config: per-language font-family (Noto Sans Devanagari/Tamil/Telugu/etc.) and line-height (1.6 for en, 1.8 for most Indic, 2.0 for Malayalam)
- INDIC_DIGIT_MAP and ascii_digits Jinja2 filter for digit normalization
- Translation loading: load_translations(), load_name_translations(), load_guide_translations(), load_content_translations()
- Helper functions: make_translate_func (t()), make_url_func (url()), get_translated_state_name()
- PAGE_FATAL_BYTES_I18N = 20KB for non-English pages (vs 15KB for English)
- Updated write_page with lang parameter for language-appropriate size limits
- All build_* functions accept i18n params (lang, prefix, t_func, url_func, lang_data)
- build() loops over all 10 languages, generating pages with proper prefixes

### Template Updates (9 files)
- base.html: dynamic body CSS (font-family + line-height from lang_css), t() for all UI strings, url() for internal links
- emergency_bar.html: t() for all service labels
- home.html: t() for headings/labels, url() for state/guide links, display_name for translated state names
- state.html: t() for all labels, url() for district/city/resource links
- district.html: t() for labels, url() for breadcrumb and back link
- city.html: t() for labels including population_rank, url() for links
- guide.html: t() for section headings, url() for other guide links
- static_page.html: url() for breadcrumb home link
- language_switcher.html: compact EN/HI/TA labels, no /en/ prefix for English, active lang highlighted with blue background (#e3f2fd)

## Page Count

10,580 HTML pages across 10 languages (10x Phase 1's 1,058 pages)

## Build Stats

- Build time: ~4.4s
- Total size: ~47.9 MB (46.8 KB average per page, 4.5 KB average)
- Zero FATAL errors (all under size limits)
- 49 warnings (guide pages in Indic scripts between 12-17KB, all under 20KB i18n limit)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 339e322 | feat(02-03): extend build.py with i18n language loop and translation support |
| 2 | 5c71740 | feat(02-03): update all templates with t(), url(), per-language CSS, switcher fix |

## Verification Results

1. `lang="hi"` attribute set on Hindi pages
2. `line-height:1.8` applied to Hindi body
3. `line-height:2.0` applied to Malayalam body
4. `'Noto Sans Devanagari'` in Hindi font-family
5. `/hi/state/` language-prefixed links in Hindi homepage
6. Active language highlighted with blue background in switcher
7. No `/en/` prefix in English pages

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| ID | Decision | Context |
|----|----------|---------|
| I18N-04 | 20KB fatal limit for non-English pages | Indic UTF-8 text is ~3x larger than English; 15KB too tight for translated guides |
| I18N-05 | Compact language labels (EN/HI/TA) not full names | Saves bytes, reduces page width, better for mobile |
| I18N-06 | English pages have no URL prefix (root), others get /hi/, /ta/, etc. | English is default/canonical |

## Key Files

### Created
- (none, all files modified)

### Modified
- build.py (210 insertions, 61 deletions)
- templates/base.html
- templates/home.html
- templates/state.html
- templates/district.html
- templates/city.html
- templates/guide.html
- templates/static_page.html
- templates/macros/emergency_bar.html
- templates/macros/language_switcher.html

## Next Phase Readiness

Plan 02-04 (final Phase 2 plan) should focus on:
- Testing and validation of all language pages
- Ensuring all translated content renders correctly
- Cross-browser testing of Indic scripts
- Deployment of multi-language site
