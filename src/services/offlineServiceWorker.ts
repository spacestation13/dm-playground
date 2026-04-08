const APP_SHELL_CACHE_PREFIX = 'app-shell'
const REMOTE_DEP_CACHE_PREFIX = 'remote-deps'
const REMOTE_CACHE_ORIGINS = new Set([
  'https://cdn.jsdelivr.net',
  'https://unpkg.com',
])

type CacheUrlsMessage = {
  type: 'CACHE_URLS'
  urls: string[]
}

export async function registerOfflineServiceWorker() {
  if (!import.meta.env.PROD || typeof window === 'undefined') {
    return
  }

  if (!('serviceWorker' in navigator)) {
    return
  }

  const hadController = !!navigator.serviceWorker.controller
  const serviceWorkerUrl = new URL(
    `${import.meta.env.BASE_URL}sw.js`,
    window.location.origin
  )

  try {
    const registration = await navigator.serviceWorker.register(
      serviceWorkerUrl,
      {
        type: 'classic',
      }
    )

    const readyRegistration = await navigator.serviceWorker.ready
    const activeWorker =
      readyRegistration.active ?? registration.active ?? registration.waiting

    if (activeWorker && !hadController) {
      const message: CacheUrlsMessage = {
        type: 'CACHE_URLS',
        urls: collectOfflineCacheUrls(),
      }
      activeWorker.postMessage(message)
    }
  } catch (error) {
    console.warn('Failed to register offline service worker', error)
  }
}

function collectOfflineCacheUrls() {
  const discoveredUrls = new Set<string>([
    new URL(import.meta.env.BASE_URL, window.location.origin).toString(),
    new URL(
      `${import.meta.env.BASE_URL}index.html`,
      window.location.origin
    ).toString(),
  ])

  for (const resource of performance.getEntriesByType('resource')) {
    if (!('name' in resource) || typeof resource.name !== 'string') {
      continue
    }

    const url = new URL(resource.name, window.location.href)
    if (
      url.origin === window.location.origin ||
      REMOTE_CACHE_ORIGINS.has(url.origin)
    ) {
      url.hash = ''
      discoveredUrls.add(url.toString())
    }
  }

  const selector = [
    'script[src]',
    'link[rel="stylesheet"][href]',
    'link[rel="modulepreload"][href]',
  ].join(', ')

  for (const element of document.querySelectorAll(selector)) {
    let source = ''
    if (element instanceof HTMLScriptElement) {
      source = element.src
    } else if (element instanceof HTMLLinkElement) {
      source = element.href
    }

    if (!source) {
      continue
    }

    const url = new URL(source, window.location.href)
    if (
      url.origin === window.location.origin ||
      REMOTE_CACHE_ORIGINS.has(url.origin)
    ) {
      url.hash = ''
      discoveredUrls.add(url.toString())
    }
  }

  return Array.from(discoveredUrls)
}

export async function clearOfflineCaches() {
  if (typeof window === 'undefined') {
    return
  }

  if (typeof caches !== 'undefined') {
    const cacheKeys = await caches.keys()
    await Promise.all(
      cacheKeys
        .filter(
          (cacheName) =>
            cacheName.startsWith(APP_SHELL_CACHE_PREFIX) ||
            cacheName.startsWith(REMOTE_DEP_CACHE_PREFIX)
        )
        .map((cacheName) => caches.delete(cacheName))
    )
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      registrations.map((registration) => registration.unregister())
    )
  }
}
