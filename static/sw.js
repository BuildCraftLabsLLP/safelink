/**
 * SafeLink India — Service Worker
 *
 * Caching strategy:
 *   - INSTALL: precache homepage (/)
 *   - HTML navigation: stale-while-revalidate with time-based freshness
 *   - /api/* requests: network-first with cache fallback
 *   - All other assets: pass through to network (styles are inline)
 */

const CACHE_NAME = 'safelink-v1';
const PRECACHE_URLS = ['/'];

// Freshness thresholds for HTML cache
const HTML_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;       // 24 hours — serve from cache without revalidation
const HTML_CACHE_MAX_LIFETIME = 7 * 24 * 60 * 60 * 1000; // 7 days — evict stale entries beyond this

// ---------------------------------------------------------------------------
// INSTALL — precache critical resources
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          fetch(url).then((response) => {
            if (!response.ok) {
              throw new Error(`Precache failed for ${url}: ${response.status}`);
            }
            const headers = new Headers(response.headers);
            headers.set('sw-fetched-on', String(Date.now()));
            return cache.put(url, new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: headers,
            }));
          })
        )
      );
    }).then(() => {
      // Activate immediately on first install — don't wait for old clients
      return self.skipWaiting();
    })
  );
});

// ---------------------------------------------------------------------------
// ACTIVATE — clean up old caches
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Take control of all open clients immediately
      return clients.claim();
    })
  );
});

// ---------------------------------------------------------------------------
// FETCH — routing logic
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // ---- /api/* : network-first ----
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // ---- HTML navigation : stale-while-revalidate ----
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  // ---- All other requests : fall through to network (no caching) ----
  // Styles are inline so no need to cache CSS/JS/images at the SW level.
});

// ---------------------------------------------------------------------------
// Strategy: Network-first for API requests
// ---------------------------------------------------------------------------
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Both failed — return empty JSON fallback
    return new Response(
      JSON.stringify({ alerts: [], cached: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ---------------------------------------------------------------------------
// Strategy: Stale-while-revalidate for HTML navigations
// ---------------------------------------------------------------------------
async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    const fetchedOn = Number(cached.headers.get('sw-fetched-on') || 0);
    const age = Date.now() - fetchedOn;

    // If within freshness window, return cached — no network hit
    if (age < HTML_CACHE_MAX_AGE) {
      return cached;
    }

    // If within lifetime but stale, return cached AND update in background
    if (age < HTML_CACHE_MAX_LIFETIME) {
      // Fire-and-forget background update
      updateCache(request, cache);
      return cached;
    }

    // Beyond lifetime — treat as cache miss, fetch fresh
  }

  // No valid cache entry — fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cacheResponse(request, response.clone(), cache);
    }
    return response;
  } catch (err) {
    // Offline and no cache — last resort: try any cached version
    if (cached) {
      return cached;
    }
    return new Response('Offline — please check your connection.', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Cache an HTML response with a sw-fetched-on timestamp header.
 */
async function cacheResponse(request, response, cache) {
  const headers = new Headers(response.headers);
  headers.set('sw-fetched-on', String(Date.now()));
  const timestamped = new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
  await cache.put(request, timestamped);
}

/**
 * Background-update a cached response (stale-while-revalidate refresh).
 */
async function updateCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cacheResponse(request, response, cache);
    }
  } catch (err) {
    // Silently fail — the cached version was already returned
  }
}
