let hasRequestedPersistentStorage = false

export function ensurePersistentStorage() {
  if (hasRequestedPersistentStorage || typeof navigator === 'undefined') {
    return
  }

  const storageManager = navigator.storage
  if (!storageManager || typeof storageManager.persist !== 'function') {
    return
  }

  hasRequestedPersistentStorage = true
  void storageManager.persist().catch(() => undefined)
}
