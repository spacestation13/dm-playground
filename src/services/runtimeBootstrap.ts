import { ByondStatus, byondService } from './ByondService'
import { commandQueueService } from './CommandQueueService'
import { emulatorService } from './EmulatorService'
import { ensurePersistentStorage } from './storagePersistence'

let bootstrapPromise: Promise<void> | null = null

// The snapshot is keyed by the active BYOND version; the worker adds everything else it depends on.
const snapshotKeyFor = (version: string) => `byond=${version}`

export function ensureRuntime() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const snapshotVersion = await byondService.getSnapshotVersion()
      const restored = await emulatorService.start(
        snapshotVersion ? snapshotKeyFor(snapshotVersion) : null
      )

      if (restored && snapshotVersion) {
        commandQueueService.resumeRestored()
        byondService.adoptRestoredVersion(snapshotVersion)
        // The snapshot's clock stopped when it was saved.
        await commandQueueService.runToSuccess(
          '/bin/date',
          `-u\0-s\0@${Math.round(Date.now() / 1000)}`
        )
      } else {
        await byondService.initialize()
        const activeVersion = byondService.getActiveVersion()
        if (
          activeVersion &&
          byondService.getStatus(activeVersion) === ByondStatus.Installed
        ) {
          // The guest must be between commands, or the restored VM would answer one nobody sent.
          do {
            await commandQueueService.whenIdle()
          } while (commandQueueService.getBusy())
          emulatorService.saveSnapshot(snapshotKeyFor(activeVersion))
        }
      }

      void ensurePersistentStorage()
    })().catch((error) => {
      bootstrapPromise = null
      throw error
    })
  }

  return bootstrapPromise
}
