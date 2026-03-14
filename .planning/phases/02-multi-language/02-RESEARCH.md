# Phase 2: Multi-Language (10 Languages) - Research

**Researched:** 2026-03-15
**Domain:** i18n / multi-language static site build with Indic script rendering
**Confidence:** HIGH

## Summary

This phase extends all ~1,058 Phase 1 pages to render in 10 languages via URL prefix routing (`/hi/`, `/ta/`, etc.), producing ~10,580 total HTML files. The codebase is a Python + Jinja2 static site generator (`build.py`) that reads JSON data and renders templates to `dist/`.

The approach is straightforward: create per-language JSON translation files (`data/i18n/{lang}.json`), add a translation lookup function to Jinja2 templates, and wrap `build.py`'s existing page builders in an outer language loop. The current build takes 0.38s for 1,058 pages, so ~10x should take under 5 seconds -- well within the 3-minute limit with no optimization needed.

Key challenges are: (1) identifying and extracting all hardcoded English strings from templates, (2) correct Indic script rendering via CSS (line-height, font stack), (3) ensuring phone numbers always render as ASCII digits, and (4) generating accurate AI translations for 9 languages.

**Primary recommendation:** Use a flat-key JSON translation file per language with a `t()` Jinja2 function for template strings, keep data file translations (guides, content pages, place names) in separate per-language JSON overlays, and add inline CSS per-language for script-specific line-height and font adjustments.

## CRITICAL: Language List Discrepancy

The `02-CONTEXT.md` from the discuss phase lists Urdu (ur) and Odia (or). However, the objective context explicitly states **REQUIREMENTS.md is the source of truth** with languages: en, hi, ta, te, bn, mr, kn, ml, gu, **pa** (Punjabi). The existing `language_switcher.html` in the codebase already has `pa` (Punjabi), not ur/or.

**Resolution:** Use the REQUIREMENTS.md language list: **en, hi, ta, te, bn, mr, kn, ml, gu, pa**. The language switcher already matches this.

## Standard Stack

### Core (already in use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python 3 | 3.x | Build script runtime | Already used |
| Jinja2 | 3.1.x | Template engine | Already used |
| json (stdlib) | - | Translation file loading | No dependencies needed |

### Supporting (new for this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none required) | - | - | - |

No new dependencies are needed. The translation system uses plain JSON files and a custom Jinja2 global function. No gettext, no Babel, no i18n libraries.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom JSON + `t()` function | Jinja2 i18n extension + gettext/PO files | Gettext is overkill for pre-built AI translations in JSON; adds complexity |
| Flat JSON keys | Nested JSON | Nested requires dot-path lookup; flat is simpler for ~200 keys |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Translation File Structure

```
data/
├── i18n/
│   ├── en.json          # English UI strings (source of truth for template text)
│   ├── hi.json          # Hindi translations
│   ├── ta.json          # Tamil translations
│   ├── te.json          # Telugu translations
│   ├── bn.json          # Bengali translations
│   ├── mr.json          # Marathi translations
│   ├── kn.json          # Kannada translations
│   ├── ml.json          # Malayalam translations
│   ├── gu.json          # Gujarati translations
│   └── pa.json          # Punjabi translations
├── guides/
│   ├── cyclone.json     # English (unchanged)
│   └── ...
├── guides_i18n/
│   ├── hi/
│   │   ├── cyclone.json # Hindi translation of cyclone guide
│   │   └── ...
│   ├── ta/
│   │   └── ...
│   └── ...
├── content_i18n/
│   ├── hi/
│   │   ├── about.json   # Hindi translation of about page
│   │   └── ...
│   └── ...
└── names_i18n/
    ├── hi.json          # Hindi names for states, districts, cities
    └── ...
```

### Pattern 1: UI String Translation via `t()` Function

**What:** A Jinja2 global function `t(key)` that looks up the current language's translation from a loaded dict. Falls back to English if key missing.

**When to use:** All hardcoded English text in templates (headings, labels, navigation text).

**Example:**
```python
# In build.py
def make_translate_func(translations, lang):
    """Return a t() function for the given language."""
    en_strings = translations.get("en", {})
    lang_strings = translations.get(lang, {})
    def t(key):
        return lang_strings.get(key, en_strings.get(key, key))
    return t

# When creating Jinja2 context for each page:
context["t"] = make_translate_func(all_translations, current_lang)
```

```jinja2
{# In templates, replace hardcoded English: #}
{# Before: #}
<h2>Emergency Numbers</h2>
{# After: #}
<h2>{{ t("emergency_numbers") }}</h2>
```

### Pattern 2: Outer Language Loop in Build

**What:** Wrap existing build functions in a language loop. For each language, set output prefix and translation context.

**When to use:** The main build orchestrator.

**Example:**
```python
LANGUAGES = ["en", "hi", "ta", "te", "bn", "mr", "kn", "ml", "gu", "pa"]

def build():
    # ... load data, validate, create env ...
    for lang in LANGUAGES:
        prefix = "" if lang == "en" else f"{lang}/"
        # Set language-specific context
        lang_data = apply_translations(data, lang, translations)
        build_homepage(env, stats, lang_data, lang, prefix)
        build_state_pages(env, stats, lang_data, lang, prefix)
        # ... etc
```

### Pattern 3: Data Translation Overlay

**What:** For translatable data (guide titles, section headings, content items, place names), load a per-language overlay JSON that replaces English values at build time.

**When to use:** Guide pages, content pages, state/district/city names.

**Example:**
```python
def apply_data_translations(data, lang):
    """Return a copy of data with translated strings overlaid."""
    if lang == "en":
        return data

    # Load translated guides
    translated_guides = {}
    guides_i18n_dir = DATA_DIR / "guides_i18n" / lang
    if guides_i18n_dir.exists():
        for gf in guides_i18n_dir.glob("*.json"):
            translated_guides[gf.stem] = load_json(gf)

    # Merge: translated guide replaces English guide entirely
    merged_data = dict(data)
    if translated_guides:
        merged_data["guides"] = {**data["guides"], **translated_guides}

    return merged_data
```

### Pattern 4: Output Path Prefixing

**What:** English pages go to `dist/index.html`, translated pages go to `dist/{lang}/index.html`.

**Example:**
```python
def get_output_path(base_path, lang):
    """Prefix output path with language code for non-English."""
    if lang == "en":
        return base_path
    return f"{lang}/{base_path}"

# Usage:
write_page(env, stats, get_output_path("index.html", lang), "home.html", context)
```

### Pattern 5: Language-Aware URL Generation

**What:** All internal links (`href`) must include the language prefix. The language switcher must link to the same page in a different language.

**Example:**
```python
def make_url_func(lang):
    """Return a url() function that adds language prefix."""
    prefix = f"/{lang}" if lang != "en" else ""
    def url(path):
        return f"{prefix}{path}"
    return url

# In context:
context["url"] = make_url_func(lang)
```

```jinja2
{# In templates: #}
<a href="{{ url('/state/' ~ state.slug ~ '/') }}">{{ state.name }}</a>
```

### Anti-Patterns to Avoid
- **Separate template sets per language:** Do NOT create 10 copies of each template. Use one template set with `t()` function.
- **Inline translations in templates:** Do NOT put `{% if lang == 'hi' %}...{% elif lang == 'ta' %}...{% endif %}` blocks. Use the `t()` lookup.
- **Translating slugs/URLs:** Do NOT translate URL slugs. `/hi/state/tamil-nadu/` is correct (English slug, Hindi content). Translating slugs creates broken links and complexity.
- **Loading all translations for every page:** Load translation dicts once at startup, pass the relevant language's dict to each page render.

## Translatable Content Inventory

### Category 1: Template UI Strings (~85 unique strings)

These are hardcoded English strings in Jinja2 templates that need `t()` wrapping:

**base.html:**
- "SafeLink India" (site name -- keep in English or translate)
- "Emergency Info" (title suffix)
- "Emergency information for India. Works on 2G." (default meta description)
- "Skip to content"
- "Emergency info for India -- works on 2G" (tagline)
- "WARNING:" / "General information only."
- "Read disclaimer"
- "Emergency:"
- "Home" / "About" / "Disclaimer" / "First Aid" / "Emergency Kit" (footer nav)

**emergency_bar.html:**
- "Emergency" / "Police" / "Fire" / "Ambulance" / "Disaster"

**home.html:**
- "Quick Reference"
- "Earthquake:" / "DROP, COVER, HOLD ON"
- "Cyclone:" / "Move to pucca shelter"
- "Flood:" / "Do NOT wade through water"
- "Fire:" / "Get low, get out, call 101"
- "Gas leak:" / "Do NOT use electrical switches"
- "States & Union Territories"
- "Disaster Safety Guides"
- "Helplines & Resources"
- "Mental Health:" / "Other Helplines:"
- "Women Helpline:" / "Child Helpline:" / "Senior Citizen:"
- "Government Resources"
- "PM CARES Fund" / "SACHET Early Warnings" / "NDMA Toll-free:" / "NDMA Control Room:"

**state.html:**
- "Emergency Numbers" (heading pattern: `{{ state.name }} Emergency Numbers`)
- "Disaster Helpline:" / "SEOC:" / "SEOC Mobile:" / "WhatsApp:" / "Toll-free:" / "SDRF:"
- "National Emergency:"
- "Quick Reference" (same block as home)
- "Districts" / "Cities" / "Resources"
- "Last verified:"

**district.html:**
- "Emergency Numbers" / "District HQ:" / "Back to {{ state.name }}" / "Resources"
- "District" (in title: "{{ district.name }} District")
- "National Emergency:" / "Police:" / "Fire:" / "Ambulance:"

**city.html:**
- Same as district, plus "Population rank:" / "in India"

**guide.html:**
- "Emergency Actions" / "India-Specific Notes" / "Other Guides"
- "Actionable disaster safety information for India." (default description)

**breadcrumb.html:**
- "Home" (breadcrumb root label)

### Category 2: Data Content (~308 translatable items)

| Data Source | Items | What to Translate |
|-------------|-------|-------------------|
| 5 guide files | ~165 items | titles, subtitles, section headings, all list items, emergency actions, india_specific notes |
| 5 content files | ~143 items | titles, subtitles, section headings, all list items, section content paragraphs |

### Category 3: Place Names (~1,047 names)

| Data Source | Count | Notes |
|-------------|-------|-------|
| State names | 36 | Translate to local script (e.g., "Tamil Nadu" -> "தமிழ்நாடு") |
| District names | 786 | Translate to local script |
| City names | 225 | Translate to local script |

**Decision point:** Place names can be transliterated (phonetic in target script) rather than truly "translated." For well-known places, use the official local-language name. This is a large volume but each is just a name string.

### Category 4: Non-Translatable Items (keep as-is)

- Phone numbers (always ASCII digits)
- URLs (href values)
- Slugs (URL path segments)
- External org names that are acronyms: NDMA, NDRF, SEOC, SDRF, SDMA, IMD, PM CARES
- `tel:` link values

## Translation JSON Schema

### UI Strings (`data/i18n/{lang}.json`)

```json
{
  "_meta": {
    "lang": "hi",
    "lang_name": "Hindi",
    "script": "Devanagari",
    "generated": "2026-03-15",
    "source_lang": "en"
  },
  "site_name": "SafeLink India",
  "emergency_info": "आपातकालीन जानकारी",
  "skip_to_content": "सामग्री पर जाएं",
  "tagline": "भारत के लिए आपातकालीन जानकारी — 2G पर काम करता है",
  "warning": "चेतावनी:",
  "general_info_only": "केवल सामान्य जानकारी।",
  "read_disclaimer": "अस्वीकरण पढ़ें",
  "emergency": "आपातकालीन",
  "home": "होम",
  "about": "हमारे बारे में",
  "disclaimer": "अस्वीकरण",
  "first_aid": "प्राथमिक चिकित्सा",
  "emergency_kit": "आपातकालीन किट",
  "police": "पुलिस",
  "fire": "अग्निशमन",
  "ambulance": "एम्बुलेंस",
  "disaster": "आपदा",
  "quick_reference": "त्वरित संदर्भ",
  "earthquake": "भूकंप",
  "drop_cover_hold": "नीचे झुकें, छिपें, पकड़ें",
  "cyclone": "चक्रवात",
  "move_to_shelter": "पक्के आश्रय में जाएं",
  "flood": "बाढ़",
  "do_not_wade": "पानी में न चलें",
  "gas_leak": "गैस रिसाव",
  "do_not_use_switches": "बिजली के स्विच का उपयोग न करें",
  "states_and_uts": "राज्य और केंद्र शासित प्रदेश",
  "disaster_safety_guides": "आपदा सुरक्षा गाइड",
  "helplines_resources": "हेल्पलाइन और संसाधन",
  "mental_health": "मानसिक स्वास्थ्य",
  "other_helplines": "अन्य हेल्पलाइन",
  "women_helpline": "महिला हेल्पलाइन",
  "child_helpline": "बाल हेल्पलाइन",
  "senior_citizen": "वरिष्ठ नागरिक",
  "government_resources": "सरकारी संसाधन",
  "emergency_numbers": "आपातकालीन नंबर",
  "disaster_helpline": "आपदा हेल्पलाइन",
  "national_emergency": "राष्ट्रीय आपातकालीन",
  "districts": "जिले",
  "cities": "शहर",
  "resources": "संसाधन",
  "last_verified": "अंतिम सत्यापन",
  "district_hq": "जिला मुख्यालय",
  "back_to": "वापस",
  "population_rank": "जनसंख्या रैंक",
  "in_india": "भारत में",
  "emergency_actions": "आपातकालीन कार्रवाई",
  "india_specific_notes": "भारत-विशिष्ट नोट्स",
  "other_guides": "अन्य गाइड",
  "page_not_available": "यह पेज अभी इस भाषा में उपलब्ध नहीं है।",
  "get_low_get_out": "नीचे झुकें, बाहर निकलें, 101 पर कॉल करें",
  "sachet_early_warnings": "SACHET प्रारंभिक चेतावनी",
  "ndma_toll_free": "NDMA टोल-फ्री",
  "ndma_control_room": "NDMA नियंत्रण कक्ष",
  "pm_cares_fund": "PM CARES कोष"
}
```

**Key:** ~60-70 UI string keys. Small enough for a single flat JSON per language.

### Guide Translation (`data/guides_i18n/{lang}/cyclone.json`)

Same structure as the English guide file, but with translated strings. The entire file is a translated copy of the English source:

```json
{
  "type": "cyclone",
  "title": "चक्रवात सुरक्षा गाइड - भारत",
  "slug": "cyclone",
  "sections": [
    {
      "heading": "चक्रवात से पहले",
      "items": [
        "IMD चेतावनियों को mausam.imd.gov.in पर ट्रैक करें और आकाशवाणी सुनें",
        "..."
      ]
    }
  ],
  "emergency_actions": ["112 या 1070 पर कॉल करें", "..."],
  "india_specific": "..."
}
```

### Place Name Translation (`data/names_i18n/{lang}.json`)

```json
{
  "states": {
    "AP": "ಆಂಧ್ರ ಪ್ರದೇಶ",
    "AR": "ಅರುಣಾಚಲ ಪ್ರದೇಶ",
    "...": "..."
  },
  "districts": {
    "agra": "ಆಗ್ರಾ",
    "...": "..."
  },
  "cities": {
    "mumbai": "ಮುಂಬೈ",
    "...": "..."
  }
}
```

**Alternative (simpler):** Skip district/city name translation in first pass. These are proper nouns that most users recognize in English transliteration. State names are higher priority. This reduces the translation volume from 1,047 names to just 36 state names per language.

## Build.py Modification Strategy

### Minimal Changes Required

The existing build.py needs these specific modifications:

1. **Add language config:** `LANGUAGES = ["en", "hi", "ta", "te", "bn", "mr", "kn", "ml", "gu", "pa"]`

2. **Add translation loading function:** Load `data/i18n/*.json` at startup.

3. **Add `t()` function factory:** Create per-language translation lookup.

4. **Modify each `build_*` function signature:** Add `lang` and `prefix` parameters, or restructure to accept them.

5. **Modify `write_page` call paths:** Prepend language prefix to output paths for non-English.

6. **Add language context to all template renders:** Pass `current_lang`, `t`, and `url` to every template context.

7. **Wrap build loop:** Iterate over LANGUAGES in the main `build()` function.

### Signature Changes

```python
# Before:
def build_homepage(env, stats, data):
    write_page(env, stats, "index.html", "home.html", {...})

# After:
def build_homepage(env, stats, data, lang, prefix, t_func, url_func):
    write_page(env, stats, f"{prefix}index.html", "home.html", {
        ...,
        "current_lang": lang,
        "t": t_func,
        "url": url_func,
    })
```

### Template URL Rewriting

All hardcoded paths in templates must use the `url()` function:

```jinja2
{# Before: #}
<a href="/">Home</a>
<a href="/state/{{ state.slug }}/">{{ state.name }}</a>
<a href="/disclaimer/">Disclaimer</a>

{# After: #}
<a href="{{ url('/') }}">{{ t('home') }}</a>
<a href="{{ url('/state/' ~ state.slug ~ '/') }}">{{ state.name }}</a>
<a href="{{ url('/disclaimer/') }}">{{ t('disclaimer') }}</a>
```

### Language Switcher Update

The existing language switcher already handles `current_lang` and `current_path`. The key fix: for English, the href should be `/current_path` (no prefix), not `/en/current_path`:

```jinja2
{%- for code, name in languages %}
{%- if code == current_lang|default("en") %}
<b>{{ name }}</b>
{%- else %}
{%- if code == "en" %}
<a href="{{ current_path|default('/') }}">{{ name }}</a>
{%- else %}
<a href="/{{ code }}{{ current_path|default('/') }}">{{ name }}</a>
{%- endif %}
{%- endif %}
{%- if not loop.last %} | {% endif %}
{%- endfor %}
```

## Script Rendering Requirements

### Per-Language CSS Requirements

All styles are inline (BUILD-02 constraint). Each language needs specific CSS adjustments applied to the `<body>` tag.

| Language | Script | Line-Height | Font Notes | Native Digits? |
|----------|--------|-------------|------------|----------------|
| Hindi (hi) | Devanagari | 1.8 | system-ui handles well on Android (Noto Sans Devanagari); add 'Noto Sans Devanagari' to font stack | Yes (U+0966-096F) -- common in native text |
| Tamil (ta) | Tamil | 1.8 | Tamil glyphs are tall; add 'Noto Sans Tamil' | Yes (U+0BE6-0BEF) -- rarely used, European digits preferred |
| Telugu (te) | Telugu | 1.8 | Complex conjuncts; add 'Noto Sans Telugu' | Yes (U+0C66-0C7F) -- sometimes used |
| Bengali (bn) | Bengali | 1.8 | Vowel marks extend above; add 'Noto Sans Bengali' | Yes (U+09E6-09EF) -- commonly used |
| Marathi (mr) | Devanagari | 1.8 | Same script as Hindi; same font | Yes (same as Hindi, U+0966-096F) |
| Kannada (kn) | Kannada | 1.8 | Round script, wide glyphs; add 'Noto Sans Kannada' | Yes (U+0CE6-0CEF) -- sometimes used |
| Malayalam (ml) | Malayalam | 1.8-2.0 | Most vertically complex Indic script; needs generous line-height; add 'Noto Sans Malayalam' | Yes (U+0D66-0D6F) -- sometimes used |
| Gujarati (gu) | Gujarati | 1.8 | No headline (top bar); add 'Noto Sans Gujarati' | Yes (U+0AE6-0AEF) -- sometimes used |
| Punjabi (pa) | Gurmukhi | 1.8 | Similar to Devanagari; add 'Noto Sans Gurmukhi' | Yes (U+0A66-0A6F) -- sometimes used |
| English (en) | Latin | 1.6 (current) | No changes needed | N/A |

**Confidence:** MEDIUM -- line-height values are best practices from web typography resources. The current base.html already uses `line-height:1.6`. Indic scripts generally need 1.7-2.0 for proper rendering without clipping.

### Implementation: Language-Conditional Body Style

Since all styles are inline, modify the `<body>` tag in `base.html`:

```jinja2
<body style="font-family:{% if current_lang in ['hi','mr'] %}'Noto Sans Devanagari',{% elif current_lang == 'ta' %}'Noto Sans Tamil',{% elif current_lang == 'te' %}'Noto Sans Telugu',{% elif current_lang == 'bn' %}'Noto Sans Bengali',{% elif current_lang == 'kn' %}'Noto Sans Kannada',{% elif current_lang == 'ml' %}'Noto Sans Malayalam',{% elif current_lang == 'gu' %}'Noto Sans Gujarati',{% elif current_lang == 'pa' %}'Noto Sans Gurmukhi',{% endif %}system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;font-size:1rem;line-height:{% if current_lang in ['hi','ta','te','bn','mr','kn','gu','pa'] %}1.8{% elif current_lang == 'ml' %}2.0{% else %}1.6{% endif %};max-width:45em;margin:0 auto;padding:0 0.75rem;color:#212121">
```

**Critical:** Do NOT load external fonts via Google Fonts CDN. This is a 2G-friendly site. `system-ui` falls back to Noto Sans on Android, which includes all Indic scripts. The font-family additions are hints for desktop browsers. On Android (the primary target), system fonts handle all Indic scripts natively.

### Alternative (Cleaner): Jinja2 Macro for Body Style

```jinja2
{%- set script_fonts = {
    'hi': "'Noto Sans Devanagari',",
    'mr': "'Noto Sans Devanagari',",
    'ta': "'Noto Sans Tamil',",
    'te': "'Noto Sans Telugu',",
    'bn': "'Noto Sans Bengali',",
    'kn': "'Noto Sans Kannada',",
    'ml': "'Noto Sans Malayalam',",
    'gu': "'Noto Sans Gujarati',",
    'pa': "'Noto Sans Gurmukhi',"
} -%}
{%- set line_heights = {'ml': '2.0'} -%}
{%- set lh = line_heights.get(current_lang|default('en'), '1.8' if current_lang|default('en') != 'en' else '1.6') -%}
```

## ASCII Numeral Enforcement

### The Problem

Some Indic scripts have native digit characters. AI translation tools may produce native digits for phone numbers. For example, "112" in Hindi could be rendered as "११२" (Devanagari digits). This is dangerous for emergency numbers -- users need to see ASCII digits they can dial.

### Which Scripts Have Native Digits

All 9 non-English scripts have native Unicode digits:

| Script | Digit Range | Example (112) | Risk Level |
|--------|-------------|----------------|------------|
| Devanagari (hi, mr) | U+0966-096F | ११२ | HIGH -- commonly used |
| Bengali (bn) | U+09E6-09EF | ১১২ | HIGH -- commonly used |
| Gujarati (gu) | U+0AE6-0AEF | ૧૧૨ | MEDIUM |
| Gurmukhi (pa) | U+0A66-0A6F | ੧੧੨ | MEDIUM |
| Tamil (ta) | U+0BE6-0BEF | ௧௧௨ | LOW -- Europeans digits preferred |
| Telugu (te) | U+0C66-0C7F | ౧౧౨ | MEDIUM |
| Kannada (kn) | U+0CE6-0CEF | ೧೧೨ | MEDIUM |
| Malayalam (ml) | U+0D66-0D6F | ൧൧൨ | MEDIUM |

### Solution: Two-Layer Defense

**Layer 1: Translation instructions.** When generating AI translations, explicitly instruct: "Keep all phone numbers, emergency numbers, and numeric codes as ASCII digits (0-9). Do not convert to native script digits."

**Layer 2: Build-time sanitization.** Add a Jinja2 filter or post-processing step that replaces any native Indic digit with its ASCII equivalent:

```python
# In build.py -- register as Jinja2 filter
INDIC_DIGIT_MAP = {}
for base in [0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66]:
    for i in range(10):
        INDIC_DIGIT_MAP[chr(base + i)] = str(i)

def ascii_digits(text):
    """Replace any Indic script digits with ASCII equivalents."""
    return ''.join(INDIC_DIGIT_MAP.get(c, c) for c in str(text))

# Register as Jinja2 filter:
env.filters['ascii_digits'] = ascii_digits
```

**Usage in templates:**
```jinja2
{# For phone numbers -- always filter through ascii_digits #}
<a href="tel:{{ number }}">{{ number|ascii_digits }}</a>
```

**Layer 3: Build validation.** After rendering, scan all non-English HTML files for any Indic digit characters and flag as errors:

```python
import re
INDIC_DIGIT_PATTERN = re.compile(r'[\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C7F\u0CE6-\u0CEF\u0D66-\u0D6F]')
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| i18n framework | Full gettext/PO system | Simple JSON + `t()` function | Only ~70 UI keys, AI-generated translations, no plural forms needed for this content |
| Font loading | External font CDN or self-hosted webfonts | system-ui font stack with Noto Sans hints | 2G-friendly; Android natively includes Noto Sans for all Indic scripts |
| Digit conversion | Regex on full HTML | Character map function as Jinja2 filter | Apply selectively to phone numbers, not full page content |
| Translation generation | Manual translation or per-string API calls | Bulk AI translation of JSON files | Generate all 9 language files in one pass per content type |

## Common Pitfalls

### Pitfall 1: Vowel Mark Clipping in Devanagari/Tamil/Bengali
**What goes wrong:** With default `line-height: 1.6`, Devanagari vowel marks (matras) above and below consonants get clipped. Tamil and Malayalam have tall glyphs that overflow.
**Why it happens:** Latin-optimized line-height is too tight for Indic scripts that use combining marks above and below the baseline.
**How to avoid:** Use `line-height: 1.8` minimum for all Indic scripts, `2.0` for Malayalam. Test with real content that includes combining marks.
**Warning signs:** Vowel marks appearing cut off at the top, overlapping text on adjacent lines.

### Pitfall 2: Phone Numbers in Native Digits
**What goes wrong:** Emergency number "112" displays as "११२" in Hindi, making it unrecognizable and un-dialable.
**Why it happens:** AI translation models convert digits to native script digits. Some fonts may also substitute digits.
**How to avoid:** Three-layer defense: translation instructions + Jinja2 filter + build validation scan.
**Warning signs:** Any non-ASCII digit character in rendered HTML.

### Pitfall 3: Language Switcher Broken Links
**What goes wrong:** Clicking "Hindi" on a Tamil page leads to a 404 because the path construction is wrong.
**Why it happens:** The `current_path` variable doesn't account for language prefix stripping/addition correctly.
**How to avoid:** `current_path` should always be the language-neutral path (e.g., `/state/tamil-nadu/`). The switcher constructs `/{lang}{current_path}` for non-English and just `{current_path}` for English.
**Warning signs:** Language switcher links containing double prefixes like `/hi/ta/state/...`.

### Pitfall 4: Page Size Explosion with Translated Content
**What goes wrong:** Pages exceed 15KB when translated because UTF-8 Indic characters use 3 bytes vs 1 byte for ASCII Latin characters.
**Why it happens:** A 5KB English page could become ~10-12KB in Hindi because each Devanagari character is 3 bytes in UTF-8.
**How to avoid:** Current average page size is 3,659 bytes (well under 15KB). Even with 3x expansion, the largest English page (cyclone guide at 8.5KB) would be ~17KB. Monitor the cyclone guide page carefully. May need to trim content or split guide pages if they exceed 15KB.
**Warning signs:** The build's existing size checker will catch this. Watch for WARN/FATAL messages.

### Pitfall 5: HTML Entity vs UTF-8 for Indic Text
**What goes wrong:** Mixing HTML entities (like in the language switcher) with raw UTF-8 Indic text causes inconsistencies.
**Why it happens:** The language switcher uses HTML entities (`&#2361;`) for script names. Template content uses raw UTF-8.
**How to avoid:** Use HTML entities only in the language switcher (BUILD-03 requirement). All other Indic text should be raw UTF-8 in the JSON files and rendered as UTF-8 in templates. The `<meta charset="utf-8">` handles this.
**Warning signs:** Mojibake (garbled characters) in rendered pages.

### Pitfall 6: Missing Translation Fallback
**What goes wrong:** If a translation key is missing in `hi.json`, the page shows the raw key name (e.g., "emergency_numbers") instead of text.
**Why it happens:** Incomplete translation files.
**How to avoid:** The `t()` function falls back to English, then to the raw key. Add a build-time check that compares all translation file keys against `en.json` and warns about missing keys.
**Warning signs:** Raw key names appearing in rendered HTML.

### Pitfall 7: Internal Link Paths Missing Language Prefix
**What goes wrong:** A Hindi page links to `/state/tamil-nadu/` (English) instead of `/hi/state/tamil-nadu/` (Hindi).
**Why it happens:** Hardcoded paths in templates don't use the `url()` function.
**How to avoid:** Replace ALL hardcoded paths with `{{ url('/path/') }}`. Grep templates for `href="/` to find hardcoded paths.
**Warning signs:** Clicking a link on a translated page takes you to the English version.

## AI Translation Generation Approach

### Strategy

Use Claude API (or similar LLM) to generate translation JSON files. Process in bulk, not per-string.

### Process

1. **Extract English source:** Create `data/i18n/en.json` from all hardcoded template strings.
2. **Generate translations:** For each target language, send the English JSON to Claude API with specific instructions.
3. **Store output:** Save as `data/i18n/{lang}.json`.
4. **Repeat for guides/content:** Send each English guide/content JSON file for translation.
5. **Place names:** Generate `data/names_i18n/{lang}.json` with transliterated place names.

### Translation Prompt Template

```
Translate the following JSON from English to {LANGUAGE} ({SCRIPT} script).

Rules:
1. Keep all JSON keys exactly as-is (English keys).
2. Translate only the string values.
3. Keep all phone numbers as ASCII digits (0-9). Do NOT convert to native script digits.
4. Keep acronyms like NDMA, NDRF, SEOC, SDRF, IMD, PM CARES in English.
5. Keep "SafeLink India" as-is (brand name).
6. Keep URLs as-is.
7. Use natural, clear {LANGUAGE} for emergency instructions -- these may save lives.
8. For place names, use the official {LANGUAGE} name if well-known, otherwise transliterate.
9. Keep medical/emergency terms accurate -- do NOT simplify at the cost of accuracy.

JSON to translate:
{JSON_CONTENT}
```

### Volume Estimate

| Content Type | Files | Strings per File | Total Strings | Languages | Total Translations |
|--------------|-------|-------------------|---------------|-----------|-------------------|
| UI strings | 1 | ~70 | 70 | 9 | 630 |
| Guides | 5 | ~33 | 165 | 9 | 1,485 |
| Content pages | 5 | ~29 | 143 | 9 | 1,287 |
| Place names | 1 | ~1,047 | 1,047 | 9 | 9,423 |
| **Total** | | | **1,425** | | **12,825** |

This is a manageable volume for AI translation. The guides and content can be sent as whole files (one API call per file per language). Place names can be batched.

### Quality Verification

- **Back-translation spot check:** For 3 critical languages (hi, ta, bn), back-translate key emergency instructions to English and verify meaning is preserved.
- **Native script digit check:** Automated scan of all output JSON for native digit characters.
- **Key completeness check:** Verify every key in `en.json` exists in every `{lang}.json`.

## Build Performance

### Current Baseline
- 1,058 pages in 0.38 seconds
- Average page: 3,659 bytes

### Projected Phase 2
- 10,580 pages (10x)
- Estimated time: ~4-5 seconds (linear scaling)
- Well within 3-minute limit

### Performance Notes
- Jinja2 template compilation is cached -- rendering the same template 10x is only marginally slower than 1x
- JSON loading is fast -- 10 small translation files add negligible I/O
- No multiprocessing or optimization needed
- The main bottleneck would be disk I/O for writing 10,580 files, but even this is fast on modern SSDs
- For CI/CD on slower machines, budget 15-30 seconds worst case

### File Count
- English: ~1,058 files
- 9 additional languages: ~9,522 files
- Total: ~10,580 HTML files
- Well under the 20,000 file limit

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gettext/PO files for web i18n | JSON-based translations for static sites | ~2020+ | Simpler toolchain, better for AI-generated content |
| Google Fonts CDN for Indic scripts | system-ui / Noto Sans (pre-installed on Android) | 2018+ | Zero external font loading; Noto included in Android 7+ |
| Manual translation | AI-generated translation | 2023+ | 10x faster, but requires review |

## Open Questions

1. **Guide page size with translation:** The cyclone guide is 8,539 bytes in English. In Devanagari (3 bytes per char), it could approach 15KB. Need to verify after translation and potentially trim verbose guide content.
   - What we know: English guides average ~8KB, the 15KB limit applies
   - What's unclear: Exact expansion ratio for each language
   - Recommendation: Build and measure. If any page exceeds 15KB, truncate the least critical guide content.

2. **Place name translation priority:** Translating 786 district names and 225 city names into 9 languages is 9,099 translations. Many district names may not have well-known local-language equivalents.
   - What we know: State names (36) are well-established in all languages
   - What's unclear: Whether district/city name transliteration adds user value vs. complexity
   - Recommendation: Start with state names only. Add district/city names as a follow-up if time permits. Most Indian users can read English place names.

3. **CONTEXT.md language list discrepancy:** The CONTEXT.md lists Urdu (ur) and Odia (or), but REQUIREMENTS.md and the existing language_switcher.html use Punjabi (pa). This research uses the REQUIREMENTS.md list (pa). The planner should confirm with the user if needed.
   - Recommendation: Use pa (Punjabi) as per REQUIREMENTS.md and existing code.

## Sources

### Primary (HIGH confidence)
- `/Users/rightfulguy/SafeLink/build.py` -- full source read, build tested (0.38s, 1,058 pages)
- `/Users/rightfulguy/SafeLink/templates/*.html` -- all templates read, all hardcoded strings identified
- `/Users/rightfulguy/SafeLink/templates/macros/*.html` -- language switcher, emergency bar, breadcrumb read
- `/Users/rightfulguy/SafeLink/data/*.json` -- all data structures examined
- [Jinja2 Extensions (stable)](https://jinja.palletsprojects.com/en/stable/extensions/) -- i18n extension, install_gettext_callables
- [Codepoints.net Devanagari](https://codepoints.net/devanagari) -- Devanagari digit code points verified
- Actual build run confirming 1,058 pages, 0.38s, avg 3,659 bytes

### Secondary (MEDIUM confidence)
- [Noto Docs - Use Noto](https://notofonts.github.io/noto-docs/website/use/) -- font stack recommendations
- [W3C Devanagari Gap Analysis](https://www.w3.org/TR/deva-gap/) -- rendering requirements
- [W3C Indic Layout Requirements](https://www.w3.org/International/docs/indic-layout/) -- script rendering
- [Unicode Chapter 12](https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-12/) -- Indic script digit ranges
- [TypeDrawers - Vertical Metrics](https://typedrawers.com/discussion/4554/on-vertical-metrics-in-the-context-of-a-biscript-tamil-and-latin-font) -- Tamil line-height

### Tertiary (LOW confidence)
- Line-height specific values (1.8 for most scripts, 2.0 for Malayalam) -- based on web typography best practices and multiple sources, but not verified with actual rendering tests. Should be tested during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, verified by reading actual codebase
- Architecture (translation JSON schema, build.py mods): HIGH -- derived from actual code analysis
- Script rendering (line-height, fonts): MEDIUM -- based on W3C resources and typography sources, but specific values need testing
- ASCII numeral enforcement: HIGH -- Unicode code points verified, approach is straightforward
- AI translation approach: MEDIUM -- prompt template is best practice, but translation quality depends on execution
- Build performance: HIGH -- measured baseline, linear extrapolation is reliable

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable domain, no fast-moving dependencies)
