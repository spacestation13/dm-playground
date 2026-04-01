import { byondService } from './ByondService'
import { emulatorService } from './EmulatorService'
import { ensurePersistentStorage } from './storagePersistence'

let bootstrapPromise: Promise<void> | null = null

export function ensureRuntime() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      emulatorService.start()
      await byondService.initialize()
      void ensurePersistentStorage()
    })().catch((error) => {
      bootstrapPromise = null
      throw error
    })
  }

  return bootstrapPromise
}
