const APP_SHELL_CACHE_PREFIX = 'app-shell'
const REMOTE_DEP_CACHE_PREFIX = 'remote-deps'
const APP_SHELL_CACHE = `${APP_SHELL_CACHE_PREFIX}-v2`
const REMOTE_DEP_CACHE = `${REMOTE_DEP_CACHE_PREFIX}-v1`
const REMOTE_CACHE_ORIGINS = new Set([
  'https://cdn.jsdelivr.net',
  'https://unpkg.com',
])

const appRootUrl = new URL('./', self.location.href).toString()
const appIndexUrl = new URL('./index.html', self.location.href).toString()
const appShellNavigationCacheKey = new Request(appIndexUrl)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) =>
        cache.addAll([
          new Request(appRootUrl, { cache: 'reload' }),
          new Request(appIndexUrl, { cache: 'reload' }),
        ])
      )
      .catch(() => undefined)
  )

  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys()
      await Promise.all(
        cacheKeys
          .filter(
            (cacheName) =>
              (cacheName.startsWith(APP_SHELL_CACHE_PREFIX) &&
                cacheName !== APP_SHELL_CACHE) ||
              (cacheName.startsWith(REMOTE_DEP_CACHE_PREFIX) &&
                cacheName !== REMOTE_DEP_CACHE)
          )
          .map((cacheName) => caches.delete(cacheName))
      )

      await self.clients.claim()
    })()
  )
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'CACHE_URLS' || !Array.isArray(data.urls)) {
    return
  }

  event.waitUntil(warmCaches(data.urls))
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (REMOTE_CACHE_ORIGINS.has(url.origin)) {
    event.respondWith(cacheFirst(request, REMOTE_DEP_CACHE))
    return
  }

  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, APP_SHELL_CACHE, appShellNavigationCacheKey)
    )
    return
  }

  if (isSameOriginAssetRequest(request, url)) {
    event.respondWith(staleWhileRevalidate(request, APP_SHELL_CACHE))
  }
})

function isSameOriginAssetRequest(request, url) {
  if (url.pathname.startsWith('/assets/')) {
    return true
  }

  switch (request.destination) {
    case 'script':
    case 'style':
    case 'worker':
    case 'font':
    case 'image':
      return true
    default:
      return false
  }
}

async function warmCaches(urls) {
  const appShellCache = await caches.open(APP_SHELL_CACHE)
  const remoteDepCache = await caches.open(REMOTE_DEP_CACHE)
  const uniqueUrls = Array.from(new Set(urls))

  await Promise.all(
    uniqueUrls.map(async (urlValue) => {
      const url = new URL(urlValue, self.location.href)
      url.hash = ''

      if (REMOTE_CACHE_ORIGINS.has(url.origin)) {
        const request = new Request(url.toString())
        const cachedResponse = await remoteDepCache.match(request)
        if (cachedResponse) {
          return
        }

        const response = await fetch(request)
        if (isCacheableResponse(response)) {
          await remoteDepCache.put(request, response.clone())
        }
        return
      }

      if (url.origin !== self.location.origin) {
        return
      }

      const request = new Request(url.toString())
      const cachedResponse = await appShellCache.match(request)
      if (cachedResponse) {
        return
      }

      const response = await fetch(request)
      if (isCacheableResponse(response)) {
        await appShellCache.put(request, response.clone())
      }
    })
  )
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  const response = await fetch(request)
  if (isCacheableResponse(response)) {
    await cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request, cacheName, cacheKeyRequest) {
  const cache = await caches.open(cacheName)

  try {
    const response = await fetch(request)
    if (isCacheableResponse(response)) {
      await cache.put(cacheKeyRequest, response.clone())
    }
    return response
  } catch {
    const cachedResponse = await cache.match(cacheKeyRequest)
    if (cachedResponse) {
      return cachedResponse
    }

    throw new Error(`No cached response available for ${request.url}`)
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  const networkResponsePromise = fetch(request)
    .then(async (response) => {
      if (isCacheableResponse(response)) {
        await cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  if (cachedResponse) {
    void networkResponsePromise
    return cachedResponse
  }

  const networkResponse = await networkResponsePromise
  if (networkResponse) {
    return networkResponse
  }

  throw new Error(`No cached response available for ${request.url}`)
}

function isCacheableResponse(response) {
  return response.ok || response.type === 'opaque'
}
