const RUNTIME_ASSET_CACHE_PREFIX = 'runtime-assets'
const RUNTIME_ASSET_CACHE = `${RUNTIME_ASSET_CACHE_PREFIX}-v1`

let runtimeAssetCachePromise: Promise<Cache | null> | null = null

function getCacheStorage() {
  return typeof caches === 'undefined' ? null : caches
}

async function pruneOldRuntimeAssetCaches(storage: CacheStorage) {
  const cacheKeys = await storage.keys()
  await Promise.all(
    cacheKeys
      .filter(
        (cacheName) =>
          cacheName.startsWith(RUNTIME_ASSET_CACHE_PREFIX) &&
          cacheName !== RUNTIME_ASSET_CACHE
      )
      .map((cacheName) => storage.delete(cacheName))
  )
}

export async function openRuntimeAssetCache() {
  const storage = getCacheStorage()
  if (!storage) {
    return null
  }

  if (!runtimeAssetCachePromise) {
    runtimeAssetCachePromise = (async () => {
      await pruneOldRuntimeAssetCaches(storage)
      return storage.open(RUNTIME_ASSET_CACHE)
    })().catch(() => null)
  }

  return runtimeAssetCachePromise
}

export async function getCachedRuntimeAsset(url: string) {
  const cache = await openRuntimeAssetCache()
  if (!cache) {
    return null
  }

  return cache.match(url)
}

export async function cacheRuntimeAsset(url: string, response: Response) {
  const cache = await openRuntimeAssetCache()
  if (!cache) {
    return
  }

  try {
    await cache.put(url, response)
  } catch {
    // Ignore cache write failures. Network fetch should still succeed.
  }
}

export async function clearRuntimeAssetCaches() {
  const storage = getCacheStorage()
  runtimeAssetCachePromise = null
  if (!storage) {
    return
  }

  const cacheKeys = await storage.keys()
  await Promise.all(
    cacheKeys
      .filter((cacheName) => cacheName.startsWith(RUNTIME_ASSET_CACHE_PREFIX))
      .map((cacheName) => storage.delete(cacheName))
  )
}
