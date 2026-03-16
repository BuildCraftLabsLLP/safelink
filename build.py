#!/usr/bin/env python3
"""SafeLink India - Static Site Builder

Reads JSON data files from data/ and renders Jinja2 templates into
static HTML pages in dist/. Every generated page must be under 15KB
(English) or 20KB (non-English) to ensure 2G-friendly loading times.
"""

import json
import os
import shutil
import sys
import time
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DIST_DIR = BASE_DIR / "dist"
TEMPLATES_DIR = BASE_DIR / "templates"

PAGE_FATAL_BYTES = 15_360   # 15 KB - hard limit (English)
PAGE_WARN_BYTES = 12_288    # 12 KB - warning threshold
PAGE_FATAL_BYTES_I18N = 20_480  # 20 KB limit for non-English (Indic scripts are larger in UTF-8)

LANGUAGES = ["en", "hi", "ta", "te", "bn", "mr", "kn", "ml", "gu", "pa"]

LANG_CSS = {
    "en": {"line_height": "1.6", "font_extra": ""},
    "hi": {"line_height": "1.8", "font_extra": "'Noto Sans Devanagari',"},
    "ta": {"line_height": "1.8", "font_extra": "'Noto Sans Tamil',"},
    "te": {"line_height": "1.8", "font_extra": "'Noto Sans Telugu',"},
    "bn": {"line_height": "1.8", "font_extra": "'Noto Sans Bengali',"},
    "mr": {"line_height": "1.8", "font_extra": "'Noto Sans Devanagari',"},
    "kn": {"line_height": "1.8", "font_extra": "'Noto Sans Kannada',"},
    "ml": {"line_height": "2.0", "font_extra": "'Noto Sans Malayalam',"},
    "gu": {"line_height": "1.8", "font_extra": "'Noto Sans Gujarati',"},
    "pa": {"line_height": "1.8", "font_extra": "'Noto Sans Gurmukhi',"},
}

INDIC_DIGIT_MAP = {}
for _base in [0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66]:
    for _i in range(10):
        INDIC_DIGIT_MAP[chr(_base + _i)] = str(_i)

def ascii_digits(text):
    """Replace Indic digits with ASCII equivalents."""
    return ''.join(INDIC_DIGIT_MAP.get(c, c) for c in str(text))

# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_json(path):
    """Load and return parsed JSON from *path*."""
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def load_all_data():
    """Load every data file the build needs. Returns a dict."""
    data = {}

    data["states"] = load_json(DATA_DIR / "states.json")
    data["districts"] = load_json(DATA_DIR / "districts.json")
    data["cities"] = load_json(DATA_DIR / "cities.json")
    data["emergency_numbers"] = load_json(DATA_DIR / "emergency_numbers.json")

    # Guides
    data["guides"] = {}
    guides_dir = DATA_DIR / "guides"
    for gf in sorted(guides_dir.glob("*.json")):
        guide = load_json(gf)
        data["guides"][gf.stem] = guide

    # Content pages
    data["content"] = {}
    content_dir = DATA_DIR / "content"
    for cf in sorted(content_dir.glob("*.json")):
        data["content"][cf.stem] = load_json(cf)

    return data


def load_translations():
    """Load UI string translations from data/i18n/*.json."""
    translations = {}
    i18n_dir = DATA_DIR / "i18n"
    if i18n_dir.exists():
        for f in i18n_dir.glob("*.json"):
            translations[f.stem] = load_json(f)
    return translations


def load_name_translations():
    """Load place name translations from data/names_i18n/*.json."""
    names = {}
    names_dir = DATA_DIR / "names_i18n"
    if names_dir.exists():
        for f in names_dir.glob("*.json"):
            names[f.stem] = load_json(f)
    return names


def load_guide_translations(lang):
    """Load guide translations for a specific language."""
    guides = {}
    guide_dir = DATA_DIR / "guides_i18n" / lang
    if guide_dir.exists():
        for f in sorted(guide_dir.glob("*.json")):
            guides[f.stem] = load_json(f)
    return guides


def load_content_translations(lang):
    """Load content page translations for a specific language."""
    content = {}
    content_dir = DATA_DIR / "content_i18n" / lang
    if content_dir.exists():
        for f in sorted(content_dir.glob("*.json")):
            content[f.stem] = load_json(f)
    return content


def make_translate_func(translations, lang):
    """Create a t() function that looks up keys in the given language."""
    en_strings = translations.get("en", {})
    lang_strings = translations.get(lang, {})
    def t(key, **kwargs):
        val = lang_strings.get(key, en_strings.get(key, key))
        if kwargs:
            for k, v in kwargs.items():
                val = val.replace("{" + k + "}", str(v))
        return val
    return t


def make_url_func(lang):
    """Create a url() function that prefixes paths with language code."""
    prefix = f"/{lang}" if lang != "en" else ""
    def url(path):
        if path.startswith("http"):
            return path
        return f"{prefix}{path}"
    return url


def get_translated_state_name(state, lang, name_translations):
    """Get translated state name, falling back to English."""
    if lang == "en":
        return state["name"]
    lang_names = name_translations.get(lang, {})
    state_names = lang_names.get("states", {})
    return state_names.get(state["code"], state["name"])


# ---------------------------------------------------------------------------
# Data validation
# ---------------------------------------------------------------------------

def validate_data(data):
    """Run cross-referential integrity checks. Returns (ok, messages)."""
    errors = []
    warnings = []

    states = data["states"]
    districts = data["districts"]
    cities = data["cities"]
    numbers = data["emergency_numbers"]

    state_codes = {s["code"] for s in states}
    state_slugs = {s["slug"] for s in states}

    # States
    if len(states) != 36:
        errors.append(f"Expected 36 states, got {len(states)}")
    if len(state_codes) != len(states):
        errors.append("Duplicate state codes detected")
    if len(state_slugs) != len(states):
        errors.append("Duplicate state slugs detected")

    # Districts
    if len(districts) < 750:
        warnings.append(f"Expected 750+ districts, got {len(districts)}")
    for d in districts:
        if d["state_code"] not in state_codes:
            errors.append(
                f"District '{d['name']}' has invalid state_code '{d['state_code']}'"
            )

    # Cities
    if len(cities) < 200:
        warnings.append(f"Expected 200+ cities, got {len(cities)}")
    for c in cities:
        if c["state_code"] not in state_codes:
            errors.append(
                f"City '{c['name']}' has invalid state_code '{c['state_code']}'"
            )

    # Emergency numbers
    if "national" not in numbers:
        errors.append("Missing 'national' key in emergency_numbers.json")
    state_nums = numbers.get("states", {})
    if len(state_nums) != 36:
        warnings.append(
            f"Expected 36 state entries in emergency_numbers, got {len(state_nums)}"
        )
    for code in state_codes:
        if code not in state_nums:
            errors.append(f"Missing emergency_numbers entry for state '{code}'")

    # Guides
    guide_count = len(data.get("guides", {}))
    if guide_count < 5:
        warnings.append(f"Expected 5 guide files, got {guide_count}")

    # Content
    content_count = len(data.get("content", {}))
    if content_count < 5:
        warnings.append(f"Expected 5 content files, got {content_count}")

    # Print results
    if errors:
        print("VALIDATION ERRORS:")
        for e in errors:
            print(f"  [ERROR] {e}")
    if warnings:
        print("VALIDATION WARNINGS:")
        for w in warnings:
            print(f"  [WARN]  {w}")
    if not errors and not warnings:
        print(
            f"Validation OK: {len(states)} states, {len(districts)} districts, "
            f"{len(cities)} cities, {len(state_nums)} state emergency entries, "
            f"{guide_count} guides, {content_count} content pages"
        )

    return len(errors) == 0, errors

# ---------------------------------------------------------------------------
# Jinja2 environment
# ---------------------------------------------------------------------------

def create_env():
    """Return a configured Jinja2 Environment."""
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["ascii_digits"] = ascii_digits
    return env

# ---------------------------------------------------------------------------
# Page writer
# ---------------------------------------------------------------------------

class BuildStats:
    """Accumulate build statistics."""

    def __init__(self):
        self.pages = 0
        self.total_bytes = 0
        self.warnings = []
        self.fatal = False


def write_page(env, stats, output_path, template_name, context, lang="en"):
    """Render *template_name* with *context* and write to dist/*output_path*.

    Returns the byte size of the rendered page.
    """
    template = env.get_template(template_name)
    html = template.render(**context)
    html_bytes = html.encode("utf-8")
    size = len(html_bytes)

    dest = DIST_DIR / output_path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(html_bytes)

    stats.pages += 1
    stats.total_bytes += size

    fatal_limit = PAGE_FATAL_BYTES if lang == "en" else PAGE_FATAL_BYTES_I18N

    if size > fatal_limit:
        msg = f"FATAL: {output_path} is {size:,} bytes (limit {fatal_limit:,})"
        print(f"  [FATAL] {msg}")
        stats.warnings.append(msg)
        stats.fatal = True
    elif size > PAGE_WARN_BYTES:
        msg = f"WARNING: {output_path} is {size:,} bytes (warn at {PAGE_WARN_BYTES:,})"
        print(f"  [WARN]  {msg}")
        stats.warnings.append(msg)

    return size

# ---------------------------------------------------------------------------
# Page builders -- one function per page type
# ---------------------------------------------------------------------------

def build_homepage(env, stats, data, lang, prefix, t_func, url_func, lang_data):
    """Build homepage for a given language."""
    states_sorted = sorted(data["states"], key=lambda s: s["name"])
    national = data["emergency_numbers"].get("national", {})

    # Add display_name to each state for templates
    for s in states_sorted:
        s["display_name"] = get_translated_state_name(s, lang, lang_data["name_translations"])

    guides = lang_data["guides"] if lang != "en" and lang_data["guides"] else data.get("guides", {})

    write_page(env, stats, f"{prefix}index.html", "home.html", {
        "states": states_sorted,
        "national": national,
        "guides": guides,
        "current_path": "/",
        "current_lang": lang,
        "t": t_func,
        "url": url_func,
        "lang_css": lang_data["lang_css"],
    }, lang=lang)


def build_state_pages(env, stats, data, lang, prefix, t_func, url_func, lang_data):
    """Build state pages for a given language."""
    districts_by_state = {}
    cities_by_state = {}

    for d in data["districts"]:
        districts_by_state.setdefault(d["state_code"], []).append(d)
    for c in data["cities"]:
        cities_by_state.setdefault(c["state_code"], []).append(c)

    national = data["emergency_numbers"].get("national", {})
    state_numbers_all = data["emergency_numbers"].get("states", {})

    for state in sorted(data["states"], key=lambda s: s["name"]):
        code = state["code"]
        slug = state["slug"]

        state_districts = sorted(
            districts_by_state.get(code, []), key=lambda d: d["name"]
        )
        state_cities = sorted(
            cities_by_state.get(code, []), key=lambda c: c["name"]
        )
        state_numbers = state_numbers_all.get(code, {})

        state_display_name = get_translated_state_name(state, lang, lang_data["name_translations"])

        write_page(env, stats, f"{prefix}state/{slug}/index.html", "state.html", {
            "state": {**state, "display_name": state_display_name},
            "districts": state_districts,
            "cities": state_cities,
            "state_numbers": state_numbers,
            "national": national,
            "guides": lang_data["guides"] if lang != "en" and lang_data["guides"] else data.get("guides", {}),
            "current_path": f"/state/{slug}/",
            "current_lang": lang,
            "t": t_func,
            "url": url_func,
            "lang_css": lang_data["lang_css"],
        }, lang=lang)


def build_district_pages(env, stats, data, lang, prefix, t_func, url_func, lang_data):
    """Build district pages for a given language."""
    states_by_code = {s["code"]: s for s in data["states"]}
    national = data["emergency_numbers"].get("national", {})
    state_numbers_all = data["emergency_numbers"].get("states", {})

    for district in data["districts"]:
        state = states_by_code.get(district["state_code"])
        if not state:
            continue
        state_slug = state["slug"]
        dist_slug = district["slug"]
        state_numbers = state_numbers_all.get(district["state_code"], {})

        state_display_name = get_translated_state_name(state, lang, lang_data["name_translations"])

        write_page(
            env, stats,
            f"{prefix}state/{state_slug}/district/{dist_slug}/index.html",
            "district.html",
            {
                "district": district,
                "state": {**state, "display_name": state_display_name},
                "state_numbers": state_numbers,
                "national": national,
                "current_path": f"/state/{state_slug}/district/{dist_slug}/",
                "current_lang": lang,
                "t": t_func,
                "url": url_func,
                "lang_css": lang_data["lang_css"],
            },
            lang=lang,
        )


def build_city_pages(env, stats, data, lang, prefix, t_func, url_func, lang_data):
    """Build city pages for a given language."""
    states_by_code = {s["code"]: s for s in data["states"]}
    national = data["emergency_numbers"].get("national", {})
    state_numbers_all = data["emergency_numbers"].get("states", {})

    for city in data["cities"]:
        state = states_by_code.get(city["state_code"])
        if not state:
            continue
        state_slug = state["slug"]
        city_slug = city["slug"]
        state_numbers = state_numbers_all.get(city["state_code"], {})

        state_display_name = get_translated_state_name(state, lang, lang_data["name_translations"])

        write_page(
            env, stats,
            f"{prefix}state/{state_slug}/city/{city_slug}/index.html",
            "city.html",
            {
                "city": city,
                "state": {**state, "display_name": state_display_name},
                "state_numbers": state_numbers,
                "national": national,
                "current_path": f"/state/{state_slug}/city/{city_slug}/",
                "current_lang": lang,
                "t": t_func,
                "url": url_func,
                "lang_css": lang_data["lang_css"],
            },
            lang=lang,
        )


def build_guide_pages(env, stats, data, lang, prefix, t_func, url_func, lang_data):
    """Build guide pages for a given language."""
    guides = lang_data["guides"] if lang != "en" and lang_data["guides"] else data.get("guides", {})
    national = data["emergency_numbers"].get("national", {})

    for guide_type, guide in sorted(guides.items()):
        write_page(env, stats, f"{prefix}guide/{guide_type}/index.html", "guide.html", {
            "guide": guide,
            "guides": guides,
            "national": national,
            "current_path": f"/guide/{guide_type}/",
            "current_lang": lang,
            "t": t_func,
            "url": url_func,
            "lang_css": lang_data["lang_css"],
        }, lang=lang)


def build_static_pages(env, stats, data, lang, prefix, t_func, url_func, lang_data):
    """Build static content pages for a given language."""
    content = lang_data["content"] if lang != "en" and lang_data["content"] else data.get("content", {})
    national = data["emergency_numbers"].get("national", {})

    for page_name, page_data in sorted(content.items()):
        write_page(
            env, stats,
            f"{prefix}{page_name}/index.html",
            "static_page.html",
            {
                "page": page_data,
                "page_name": page_name,
                "national": national,
                "current_path": f"/{page_name}/",
                "current_lang": lang,
                "t": t_func,
                "url": url_func,
                "lang_css": lang_data["lang_css"],
            },
            lang=lang,
        )

# ---------------------------------------------------------------------------
# Main build orchestrator
# ---------------------------------------------------------------------------

def build():
    """Run the full build pipeline."""
    start = time.time()
    print("=" * 60)
    print("SafeLink India -- Static Site Build")
    print("=" * 60)

    # ------------------------------------------------------------------
    # 1. Verify required files exist
    # ------------------------------------------------------------------
    required_files = [
        DATA_DIR / "states.json",
        DATA_DIR / "districts.json",
        DATA_DIR / "cities.json",
        DATA_DIR / "emergency_numbers.json",
    ]
    missing = [str(f) for f in required_files if not f.exists()]
    if missing:
        print("FATAL: Missing required data files:")
        for m in missing:
            print(f"  - {m}")
        sys.exit(1)

    # ------------------------------------------------------------------
    # 2. Load data
    # ------------------------------------------------------------------
    print("\nLoading data...")
    data = load_all_data()

    # ------------------------------------------------------------------
    # 3. Validate data
    # ------------------------------------------------------------------
    print("\nValidating data...")
    ok, errors = validate_data(data)
    if not ok:
        print("\nFATAL: Data validation failed. Fix errors above.")
        sys.exit(1)

    # ------------------------------------------------------------------
    # 4. Load translations
    # ------------------------------------------------------------------
    print("\nLoading translations...")
    translations = load_translations()
    name_translations = load_name_translations()
    print(f"  UI strings: {len(translations)} languages")
    print(f"  Name translations: {len(name_translations)} languages")

    # ------------------------------------------------------------------
    # 5. Prepare output directory
    # ------------------------------------------------------------------
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(parents=True)

    # ------------------------------------------------------------------
    # 6. Create Jinja2 environment
    # ------------------------------------------------------------------
    env = create_env()
    stats = BuildStats()

    # ------------------------------------------------------------------
    # 7. Build all page types for each language
    # ------------------------------------------------------------------
    print("\nGenerating pages...\n")

    for lang in LANGUAGES:
        prefix = f"{lang}/" if lang != "en" else ""
        t_func = make_translate_func(translations, lang)
        url_func = make_url_func(lang)

        # Load language-specific data
        lang_data = {
            "lang_css": LANG_CSS.get(lang, LANG_CSS["en"]),
            "name_translations": name_translations,
            "guides": load_guide_translations(lang) if lang != "en" else {},
            "content": load_content_translations(lang) if lang != "en" else {},
        }

        print(f"  [{lang.upper()}] Building pages...")

        build_homepage(env, stats, data, lang, prefix, t_func, url_func, lang_data)
        build_state_pages(env, stats, data, lang, prefix, t_func, url_func, lang_data)
        build_district_pages(env, stats, data, lang, prefix, t_func, url_func, lang_data)
        build_city_pages(env, stats, data, lang, prefix, t_func, url_func, lang_data)
        build_guide_pages(env, stats, data, lang, prefix, t_func, url_func, lang_data)
        build_static_pages(env, stats, data, lang, prefix, t_func, url_func, lang_data)

    # ------------------------------------------------------------------
    # 8. Build summary
    # ------------------------------------------------------------------
    elapsed = time.time() - start
    print("\n" + "=" * 60)
    print("BUILD SUMMARY")
    print("=" * 60)
    print(f"  Languages       : {len(LANGUAGES)} ({', '.join(LANGUAGES)})")
    print(f"  Pages generated : {stats.pages:,}")
    print(f"  Total size      : {stats.total_bytes:,} bytes ({stats.total_bytes / 1024:.1f} KB)")
    if stats.pages > 0:
        print(f"  Average size    : {stats.total_bytes // stats.pages:,} bytes")
    print(f"  Build time      : {elapsed:.2f}s")

    if stats.warnings:
        print(f"\n  Warnings ({len(stats.warnings)}):")
        for w in stats.warnings:
            print(f"    - {w}")

    if stats.fatal:
        print("\nFATAL: One or more pages exceeded the size limit.")
        print("Fix templates to reduce page size before deploying.")
        sys.exit(1)

    print("\nBuild complete. Output in dist/")
    return 0


if __name__ == "__main__":
    sys.exit(build())
