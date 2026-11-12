/// <reference lib="webworker" />
import { unzipSync } from 'fflate'
import { decompress as decompressZstd } from 'fzstd'
import V86 from 'v86'
import v86WasmUrl from 'v86/build/v86.wasm?url'
import {
  cacheVmSnapshot,
  deleteCachedVmSnapshot,
  getCachedVmSnapshot,
} from '../services/runtimeAssetCache'
import {
  type AssetDownloadProgressMessage,
  fetchBinary,
} from './runtimeAssetDownload'

type EmulatorPort = 'console' | 'screen' | 'controller'
type Emulator = InstanceType<typeof V86>

type EmulatorInboundMessage =
  | { type: 'sendPort'; port: EmulatorPort; data: string }
  | { type: 'resizePort'; port: EmulatorPort; rows: number; cols: number }
  | { type: 'start'; snapshotKey: string | null }
  | { type: 'pause' }
  | {
      type: 'sendFile'
      commandId: string
      name: string
      data: Uint8Array
    }
  | {
      type: 'extractZip'
      commandId: string
      data: Uint8Array
      entryPrefix: string
      namePrefix: string
    }
  | { type: 'saveSnapshot'; snapshotKey: string }
  | {
      type: 'setAssetUrls'
      vmRemoteUrl: string
      seaBiosUrl: string
      vgaBiosUrl: string
    }

type EmulatorOutboundMessage =
  | { type: 'receivedOutput'; port: EmulatorPort; data: string }
  | { type: 'resetOutputConsole' }
  | AssetDownloadProgressMessage
  | { type: 'asyncResponse'; commandId: string; error?: string }
  | { type: 'started'; restored: boolean }

// Bump when anything that shapes the guest's state changes (memory size, how BYOND is installed, ...).
const SNAPSHOT_FORMAT = 2
// The initrd is unpacked here and loaded at 64 MiB, so the guest needs room past it.
const MEMORY_SIZE = 96 * 1024 * 1024

let vmRemoteUrl = 'https://spacestation13.github.io/dm-playground-linux/'
let seaBiosUrlOverride: string | null = null
let vgaBiosUrlOverride: string | null = null

const decoder = new TextDecoder()
const portToIndex: Record<EmulatorPort, number> = {
  console: 0,
  screen: 1,
  controller: 2,
}

const post = (message: EmulatorOutboundMessage) => {
  self.postMessage(message)
}

const log = (data: string) => {
  post({ type: 'receivedOutput', port: 'console', data })
}

let emulatorPromise: Promise<Emulator> | null = null

const getAssetUrls = () => ({
  bzImage: `${vmRemoteUrl}bzImage`,
  rootfs: `${vmRemoteUrl}rootfs.cpio.zst`,
  seaBios:
    seaBiosUrlOverride ??
    'https://raw.githubusercontent.com/copy/v86/master/bios/seabios.bin',
  vgaBios:
    vgaBiosUrlOverride ??
    'https://raw.githubusercontent.com/copy/v86/master/bios/vgabios.bin',
})

// Everything a snapshot depends on besides what the main thread puts in its key.
const getFullSnapshotKey = (snapshotKey: string) => {
  const urls = getAssetUrls()
  return [
    `format=${SNAPSHOT_FORMAT}`,
    `memory=${MEMORY_SIZE}`,
    v86WasmUrl,
    urls.bzImage,
    urls.rootfs,
    urls.seaBios,
    urls.vgaBios,
    snapshotKey,
  ].join('|')
}

const createEmulator = (
  wasmModule: WebAssembly.Module,
  seaBios: ArrayBuffer,
  vgaBios: ArrayBuffer,
  boot: { bzImage: ArrayBuffer; initrd: ArrayBuffer } | null
) => {
  const emulator = new V86({
    wasm_fn: async (imports: WebAssembly.Imports) => {
      const instance = await WebAssembly.instantiate(wasmModule, imports)
      return instance.exports as Record<string, unknown>
    },
    acpi: false,
    log_level: 0,
    memory_size: MEMORY_SIZE,
    vga_memory_size: 128 * 1024,
    boot_order: 0x213,
    fastboot: true,
    uart1: false,
    uart2: false,
    uart3: false,
    cmdline: null,
    preserve_mac_from_state_image: true,
    network_adapter: null,
    network_relay_url: null,
    disable_keyboard: true,
    disable_mouse: true,
    screen_container: null,
    screen_dummy: true,
    serial_container: null,
    serial_container_xtermjs: null,
    disable_speaker: true,
    bios: { buffer: seaBios },
    vga_bios: { buffer: vgaBios },
    cdrom: null,
    hda: null,
    hdb: null,
    fda: null,
    fdb: null,
    initial_state: null,
    multiboot: null,
    bzimage: boot ? { buffer: boot.bzImage } : null,
    initrd: boot ? { buffer: boot.initrd } : null,
    filesystem: {},
    bzimage_initrd_from_filesystem: false,
    // A snapshot is restored before the CPU first runs.
    autostart: boot !== null,
    virtio_console: true,
  })

  for (const [port, index] of Object.entries(portToIndex)) {
    emulator.add_listener(`virtio-console${index}-output-bytes`, (bytes) => {
      post({
        type: 'receivedOutput',
        port: port as EmulatorPort,
        data: decoder.decode(bytes),
      })
    })
  }

  return emulator
}

const loadSnapshot = async (fullKey: string) => {
  try {
    const cached = await getCachedVmSnapshot(fullKey)
    if (!cached?.body) {
      return null
    }
    return await new Response(
      cached.body.pipeThrough(new DecompressionStream('gzip'))
    ).arrayBuffer()
  } catch {
    await deleteCachedVmSnapshot(fullKey).catch(() => undefined)
    return null
  }
}

const restoreEmulator = async (
  wasmModule: WebAssembly.Module,
  seaBios: ArrayBuffer,
  vgaBios: ArrayBuffer,
  state: ArrayBuffer
) => {
  const emulator = createEmulator(wasmModule, seaBios, vgaBios, null)
  try {
    await new Promise<void>((resolve) => {
      emulator.add_listener('emulator-loaded', () => resolve())
    })
    await emulator.restore_state(state)
    await emulator.run()
    return emulator
  } catch (error) {
    await emulator.destroy().catch(() => undefined)
    throw error
  }
}

const initEmulator = async (snapshotKey: string | null) => {
  const urls = getAssetUrls()
  const fullSnapshotKey = snapshotKey ? getFullSnapshotKey(snapshotKey) : null

  const [wasmModule, seaBios, vgaBios, snapshot] = await Promise.all([
    fetchBinary(v86WasmUrl, 'v86wasm', post).then((buffer) =>
      WebAssembly.compile(buffer)
    ),
    fetchBinary(urls.seaBios, 'seabios', post),
    fetchBinary(urls.vgaBios, 'vgabios', post),
    fullSnapshotKey ? loadSnapshot(fullSnapshotKey) : null,
  ])

  if (fullSnapshotKey && snapshot) {
    try {
      const emulator = await restoreEmulator(
        wasmModule,
        seaBios,
        vgaBios,
        snapshot
      )
      log(`Restored VM snapshot (${snapshot.byteLength} bytes)\n`)
      post({ type: 'started', restored: true })
      return emulator
    } catch (error) {
      log(`Failed to restore VM snapshot, booting instead: ${String(error)}\n`)
      await deleteCachedVmSnapshot(fullSnapshotKey).catch(() => undefined)
    }
  }

  const [bzImage, rootfs] = await Promise.all([
    fetchBinary(urls.bzImage, 'bzimage', post),
    fetchBinary(urls.rootfs, 'rootfs', post),
  ])
  log(`Loaded bzImage (${bzImage.byteLength} bytes)\n`)
  log(`Loaded rootfs (${rootfs.byteLength} bytes)\n`)

  // Unpacking here is far faster than letting the emulated kernel do it.
  const initrd = decompressZstd(new Uint8Array(rootfs)).slice().buffer

  const emulator = createEmulator(wasmModule, seaBios, vgaBios, {
    bzImage,
    initrd,
  })
  post({ type: 'started', restored: false })
  return emulator
}

const ensureEmulator = (snapshotKey: string | null = null) => {
  emulatorPromise ??= initEmulator(snapshotKey)
  return emulatorPromise
}

const saveSnapshot = async (emulator: Emulator, snapshotKey: string) => {
  const state = await emulator.save_state()
  const compressed = new Blob([state])
    .stream()
    .pipeThrough(new CompressionStream('gzip'))
  await cacheVmSnapshot(
    getFullSnapshotKey(snapshotKey),
    new Response(compressed)
  )
}

const extractZip = async (
  emulator: Emulator,
  data: Uint8Array,
  entryPrefix: string,
  namePrefix: string
) => {
  const files = unzipSync(data, {
    filter: (file) =>
      file.name.startsWith(entryPrefix) && !file.name.endsWith('/'),
  })
  for (const [path, contents] of Object.entries(files)) {
    const name = path.slice(path.lastIndexOf('/') + 1)
    await emulator.create_file(`${namePrefix}${name}`, contents)
  }
}

const respond = (commandId: string, work: Promise<unknown>) => {
  work.then(
    () => post({ type: 'asyncResponse', commandId }),
    (error) => post({ type: 'asyncResponse', commandId, error: String(error) })
  )
}

self.addEventListener(
  'message',
  (event: MessageEvent<EmulatorInboundMessage>) => {
    const { data } = event

    switch (data.type) {
      case 'start': {
        post({ type: 'resetOutputConsole' })
        log(
          `System Terminal\nAssets: ${vmRemoteUrl}bzImage & ${vmRemoteUrl}rootfs.cpio.zst\n`
        )
        void ensureEmulator(data.snapshotKey).then(
          () => log('Loaded v86\n'),
          (error) => log(`Failed to initialize VM: ${String(error)}\n`)
        )
        break
      }
      case 'pause': {
        void ensureEmulator().then((instance) =>
          instance.stop().then(() => log('VM paused\n'))
        )
        break
      }
      case 'sendPort': {
        void ensureEmulator().then((instance) => {
          const portIndex = portToIndex[data.port]
          instance.bus.send(
            `virtio-console${portIndex}-input-bytes`,
            Array.from(data.data).map((char) => char.charCodeAt(0))
          )
        })
        break
      }
      case 'resizePort': {
        void ensureEmulator().then((instance) => {
          const portIndex = portToIndex[data.port]
          instance.bus.send(`virtio-console${portIndex}-resize`, [
            data.cols,
            data.rows,
          ])
        })
        break
      }
      case 'sendFile': {
        respond(
          data.commandId,
          ensureEmulator().then(async (instance) => {
            await instance.create_file(data.name, data.data)
            log(`<< ${data.name}\n`)
          })
        )
        break
      }
      case 'extractZip': {
        respond(
          data.commandId,
          ensureEmulator().then((instance) =>
            extractZip(instance, data.data, data.entryPrefix, data.namePrefix)
          )
        )
        break
      }
      case 'saveSnapshot': {
        // The state is taken before any message queued after this one reaches the guest.
        void ensureEmulator()
          .then((instance) => saveSnapshot(instance, data.snapshotKey))
          .catch((error) =>
            log(`Failed to save VM snapshot: ${String(error)}\n`)
          )
        break
      }
      case 'setAssetUrls': {
        vmRemoteUrl = data.vmRemoteUrl
        seaBiosUrlOverride = data.seaBiosUrl
        vgaBiosUrlOverride = data.vgaBiosUrl
        break
      }
      default:
        break
    }
  }
)
