import { XMLParser } from "fast-xml-parser";

// State code to name mapping (all 36 states/UTs from data/states.json)
const STATE_MAP = {
  AP: "Andhra Pradesh",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  BR: "Bihar",
  CT: "Chhattisgarh",
  GA: "Goa",
  GJ: "Gujarat",
  HR: "Haryana",
  HP: "Himachal Pradesh",
  JH: "Jharkhand",
  KA: "Karnataka",
  KL: "Kerala",
  MP: "Madhya Pradesh",
  MH: "Maharashtra",
  MN: "Manipur",
  ML: "Meghalaya",
  MZ: "Mizoram",
  NL: "Nagaland",
  OR: "Odisha",
  PB: "Punjab",
  RJ: "Rajasthan",
  SK: "Sikkim",
  TN: "Tamil Nadu",
  TG: "Telangana",
  TR: "Tripura",
  UP: "Uttar Pradesh",
  UT: "Uttarakhand",
  WB: "West Bengal",
  AN: "Andaman and Nicobar Islands",
  CH: "Chandigarh",
  DD: "Dadra and Nagar Haveli and Daman and Diu",
  DL: "Delhi",
  JK: "Jammu and Kashmir",
  LA: "Ladakh",
  LD: "Lakshadweep",
  PY: "Puducherry",
};

// Severity ranking for sorting (descending)
const SEVERITY_RANK = {
  Extreme: 4,
  Severe: 3,
  Moderate: 2,
  Minor: 1,
  Unknown: 0,
};

const SACHET_RSS_URL =
  "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml";
const CACHE_TTL = 900; // 15 minutes
const ERROR_CACHE_TTL = 300; // 5 minutes for error responses
const MAX_ALERTS = 20;
const CAP_FETCH_LIMIT = 10; // Only fetch CAP XML if <= this many filtered alerts
const RSS_FETCH_TIMEOUT = 8000; // 8 seconds
const CAP_FETCH_TIMEOUT = 5000; // 5 seconds per CAP item

/**
 * Extract English portion from a potentially multilingual title.
 * SACHET titles sometimes have English text followed by regional language text,
 * separated by delimiters like " / ", " | ", or just different scripts.
 */
function extractEnglishHeadline(title) {
  if (!title) return "Unknown Alert";
  const str = String(title);

  // Split on common delimiters used in SACHET multilingual titles
  const delimiters = [" / ", " | ", " ; "];
  for (const delim of delimiters) {
    if (str.includes(delim)) {
      const parts = str.split(delim);
      // English portion is typically the first part (Latin characters)
      const englishPart = parts.find((p) => /^[\x20-\x7E]+$/.test(p.trim()));
      if (englishPart) return englishPart.trim();
      return parts[0].trim();
    }
  }

  return str.trim();
}

/**
 * Extract source name from the author field.
 * Format: "controlroom@ndma.gov.in (Maharashtra-SDMA)" -> "Maharashtra-SDMA"
 * Format: "email (IMD Mumbai)" -> "IMD Mumbai"
 */
function extractSource(author) {
  if (!author) return "NDMA";
  const str = String(author);
  const match = str.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : "NDMA";
}

/**
 * Extract the GUID text from an RSS item's guid field.
 * Can be a string or an object with #text property.
 */
function extractGuid(guid) {
  if (!guid) return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (typeof guid === "string") return guid;
  if (typeof guid === "object" && guid["#text"]) return guid["#text"];
  return String(guid);
}

/**
 * Filter alerts by state code. Matches against author field and title/area.
 * National-level alerts (from NDMA) are always included.
 */
function filterByState(alerts, stateCode) {
  if (stateCode === "ALL") return alerts;

  const stateName = STATE_MAP[stateCode];
  if (!stateName) return [];

  return alerts.filter((alert) => {
    const source = (alert.source || "").toLowerCase();
    const headline = (alert.headline || "").toLowerCase();
    const area = (alert.area || "").toLowerCase();
    const stateNameLower = stateName.toLowerCase();

    // Include national-level alerts
    if (source === "ndma" || source.includes("ndma")) return true;

    // Match state name in source, headline, or area
    return (
      source.includes(stateNameLower) ||
      headline.includes(stateNameLower) ||
      area.includes(stateNameLower)
    );
  });
}

/**
 * Filter out expired alerts (those with an expires timestamp in the past).
 */
function filterExpired(alerts) {
  const now = new Date();
  return alerts.filter((alert) => {
    if (!alert.expires) return true; // No expiry = keep
    try {
      const expiresDate = new Date(alert.expires);
      return expiresDate > now;
    } catch {
      return true; // Can't parse = keep
    }
  });
}

/**
 * Sort alerts by severity descending (Extreme first, Unknown last).
 */
function sortBySeverity(alerts) {
  return alerts.sort((a, b) => {
    const rankA = SEVERITY_RANK[a.severity] ?? 0;
    const rankB = SEVERITY_RANK[b.severity] ?? 0;
    return rankB - rankA;
  });
}

/**
 * Parse a single RSS item into a normalised alert object.
 */
function parseRSSItem(item) {
  return {
    id: extractGuid(item.guid),
    headline: extractEnglishHeadline(item.title),
    severity: "Unknown", // RSS doesn't carry severity; enriched via CAP if possible
    event: item.category ? String(item.category) : "Weather Alert",
    area: "", // Parsed from title/description if available
    source: extractSource(item.author),
    link: item.link ? String(item.link) : "",
    effective: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    expires: null,
  };
}

/**
 * Fetch and parse the SACHET RSS feed, returning normalised alert objects.
 */
async function fetchRSSAlerts() {
  const response = await fetch(SACHET_RSS_URL, {
    signal: AbortSignal.timeout(RSS_FETCH_TIMEOUT),
    headers: {
      "User-Agent": "SafeLink-India/1.0 (disaster-alerts)",
    },
  });

  if (!response.ok) {
    throw new Error(`SACHET RSS returned HTTP ${response.status}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(xml);

  // Extract items from RSS channel
  let items = parsed?.rss?.channel?.item;
  if (!items) return [];
  // Handle single item (not wrapped in array)
  if (!Array.isArray(items)) items = [items];

  return items.map(parseRSSItem);
}

/**
 * Fetch a single CAP XML document and extract severity, expires, and headline.
 * Returns enrichment fields or null on failure.
 */
async function fetchCAPEnrichment(capUrl) {
  try {
    const response = await fetch(capUrl, {
      signal: AbortSignal.timeout(CAP_FETCH_TIMEOUT),
      headers: {
        "User-Agent": "SafeLink-India/1.0 (disaster-alerts)",
      },
    });

    if (!response.ok) return null;

    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const parsed = parser.parse(xml);

    const alert = parsed?.alert;
    if (!alert) return null;

    // info can be single object or array (multiple language blocks)
    let infoBlocks = alert.info;
    if (!infoBlocks) return null;
    if (!Array.isArray(infoBlocks)) infoBlocks = [infoBlocks];

    // Prefer en-IN language block, fall back to first
    const enBlock =
      infoBlocks.find(
        (b) =>
          b["@_language"] === "en-IN" ||
          b.language === "en-IN" ||
          b["@_language"] === "en" ||
          b.language === "en"
      ) || infoBlocks[0];

    return {
      severity: enBlock.severity || "Unknown",
      expires: enBlock.expires || null,
      headline: enBlock.headline || null,
      area:
        enBlock.area && enBlock.area.areaDesc
          ? String(enBlock.area.areaDesc)
          : null,
    };
  } catch {
    return null;
  }
}

/**
 * Enrich filtered alerts with CAP XML data (severity, expires, better headline).
 * Only runs when there are <= CAP_FETCH_LIMIT alerts to avoid excessive fetches.
 */
async function enrichWithCAP(alerts) {
  if (alerts.length === 0 || alerts.length > CAP_FETCH_LIMIT) return alerts;

  const enrichmentPromises = alerts.map((alert) => {
    if (!alert.link) return Promise.resolve(null);
    return fetchCAPEnrichment(alert.link);
  });

  const results = await Promise.allSettled(enrichmentPromises);

  return alerts.map((alert, i) => {
    const result = results[i];
    if (result.status !== "fulfilled" || !result.value) return alert;

    const enrichment = result.value;
    return {
      ...alert,
      severity: enrichment.severity || alert.severity,
      expires: enrichment.expires || alert.expires,
      headline: enrichment.headline || alert.headline,
      area: enrichment.area || alert.area,
    };
  });
}

/**
 * Main pipeline: fetch RSS, filter, enrich, sort, cap.
 */
async function fetchAndNormaliseAlerts(stateCode) {
  const allAlerts = await fetchRSSAlerts();
  const filtered = filterByState(allAlerts, stateCode);

  // Only enrich with CAP if specific state and manageable count
  let enriched;
  if (stateCode !== "ALL" && filtered.length <= CAP_FETCH_LIMIT) {
    enriched = await enrichWithCAP(filtered);
  } else {
    enriched = filtered;
  }

  const unexpired = filterExpired(enriched);
  const sorted = sortBySeverity(unexpired);

  return sorted.slice(0, MAX_ALERTS);
}

/**
 * Build standard CORS and JSON headers.
 */
function buildHeaders(cacheStatus) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Cache": cacheStatus,
  };
}

/**
 * Handle CORS preflight requests.
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * GET /api/alerts?state={code}
 * Main entry point for the Cloudflare Pages Function.
 */
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const stateParam = (url.searchParams.get("state") || "ALL").toUpperCase();
  const stateCode =
    stateParam && STATE_MAP[stateParam] ? stateParam : stateParam === "ALL" ? "ALL" : "ALL";

  const cacheKey = `alerts:${stateCode}`;
  const now = new Date().toISOString();

  // Check KV cache first
  try {
    const cached = await context.env.ALERTS_KV.get(cacheKey, { type: "json" });
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: buildHeaders("HIT"),
      });
    }
  } catch {
    // KV read error - proceed to fetch fresh data
  }

  // Cache miss - fetch fresh alerts
  try {
    const alerts = await fetchAndNormaliseAlerts(stateCode);
    const responseData = {
      alerts,
      cached_at: now,
      state: stateCode,
    };

    // Cache the result in KV
    try {
      await context.env.ALERTS_KV.put(cacheKey, JSON.stringify(responseData), {
        expirationTtl: CACHE_TTL,
      });
    } catch {
      // KV write error - still return fresh data
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: buildHeaders("MISS"),
    });
  } catch (err) {
    // Graceful degradation - return empty alerts on any upstream failure
    const errorData = {
      alerts: [],
      error: "unavailable",
      cached_at: now,
      state: stateCode,
    };

    // Cache error response with shorter TTL
    try {
      await context.env.ALERTS_KV.put(cacheKey, JSON.stringify(errorData), {
        expirationTtl: ERROR_CACHE_TTL,
      });
    } catch {
      // KV write error on error response - ignore
    }

    return new Response(JSON.stringify(errorData), {
      status: 200,
      headers: buildHeaders("MISS"),
    });
  }
}
