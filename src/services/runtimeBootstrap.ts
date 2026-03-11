import { byondService } from './ByondService'
import { emulatorService } from './EmulatorService'

let bootstrapPromise: Promise<void> | null = null

export function ensureRuntime() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      emulatorService.start()
      await byondService.initialize()
    })().catch((error) => {
      bootstrapPromise = null
      throw error
    })
  }

  return bootstrapPromise
}
