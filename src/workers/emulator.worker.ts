/// <reference lib="webworker" />
type EmulatorPort = "console" | "screen" | "controller";

declare function importScripts(...urls: string[]): void;
declare const V86: new (config: Record<string, unknown>) => {
  bus: { send: (event: string, data: number[] | Uint8Array) => void };
  add_listener: (event: string, handler: (bytes: Uint8Array) => void) => void;
  create_file: (name: string, data: Uint8Array) => Promise<void>;
  run: () => Promise<void>;
  stop: () => Promise<void>;
};

type EmulatorInboundMessage =
  | { type: "sendPort"; port: EmulatorPort; data: string }
  | { type: "resizePort"; port: EmulatorPort; rows: number; cols: number }
  | { type: "start" }
  | { type: "pause" }
  | { type: "sendFile"; name: string; data: Uint8Array };

type EmulatorOutboundMessage =
  | { type: "receivedOutput"; port: EmulatorPort; data: string }
  | { type: "resetOutputConsole" }
  | { type: "asyncResponse"; commandId: string };

const vmRemoteUrl = "https://spacestation13.github.io/dm-playground-linux/";
const vmLocalUrl = "/lib/";

const decoder = new TextDecoder();
const portToIndex: Record<EmulatorPort, number> = {
  console: 0,
  screen: 1,
  controller: 2,
};

const post = (message: EmulatorOutboundMessage) => {
  self.postMessage(message);
};

let emulator: InstanceType<typeof V86> | null = null;
let emulatorPromise: Promise<InstanceType<typeof V86>> | null = null;

const fetchBinary = async (urlValue: string) => {
  const response = await fetch(urlValue);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${urlValue}: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return buffer;
};

const initEmulator = async () => {
  if (emulator) {
    return emulator;
  }

  importScripts(`${vmLocalUrl}libv86.js`);

  const bzImageUrl = `${vmRemoteUrl}bzImage`;
  const rootfsUrl = `${vmRemoteUrl}rootfs.cpio.lz4`;
  const [bzImageBuffer, rootfsBuffer] = await Promise.all([
    fetchBinary(bzImageUrl),
    fetchBinary(rootfsUrl),
  ]);

  post({
    type: "receivedOutput",
    port: "console",
    data: `Loaded bzImage (${bzImageBuffer.byteLength} bytes)\n`,
  });
  post({
    type: "receivedOutput",
    port: "console",
    data: `Loaded rootfs (${rootfsBuffer.byteLength} bytes)\n`,
  });

  emulator = new V86({
    wasm_path: `${vmLocalUrl}v86.wasm`,
    acpi: false,
    log_level: 0,
    memory_size: 128 * 1024 * 1024,
    vga_memory_size: 8 * 1024 * 1024,
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
    screen_dummy: false,
    serial_container: null,
    serial_container_xtermjs: null,
    disable_speaker: true,
    bios: {
      url: "https://raw.githubusercontent.com/copy/v86/master/bios/seabios.bin",
    },
    vga_bios: {
      url: "https://raw.githubusercontent.com/copy/v86/master/bios/vgabios.bin",
    },
    cdrom: null,
    hda: null,
    hdb: null,
    fda: null,
    fdb: null,
    initial_state: null,
    multiboot: null,
    bzimage: {
      buffer: bzImageBuffer,
    },
    initrd: {
      buffer: rootfsBuffer,
    },
    filesystem: {},
    bzimage_initrd_from_filesystem: false,
    autostart: true,
    virtio_console: true,
  });

  for (let i = 0; i < 3; i += 1) {
    emulator.add_listener(`virtio-console${i}-output-bytes`, (bytes) => {
      const port = (Object.keys(portToIndex) as EmulatorPort[]).find(
        (key) => portToIndex[key] === i,
      );
      if (!port) {
        return;
      }
      post({
        type: "receivedOutput",
        port,
        data: decoder.decode(bytes),
      });
    });
  }

  return emulator;
};

const ensureEmulator = async () => {
  if (!emulatorPromise) {
    emulatorPromise = initEmulator();
  }
  return emulatorPromise;
};

self.addEventListener(
  "message",
  (event: MessageEvent<EmulatorInboundMessage>) => {
    const { data } = event;

    switch (data.type) {
      case "start": {
        post({ type: "resetOutputConsole" });
        post({
          type: "receivedOutput",
          port: "console",
          data: `VM assets (remote): ${vmRemoteUrl}bzImage and ${vmRemoteUrl}rootfs.cpio.lz4\n`,
        });
        void ensureEmulator().then(
          () => {
            post({
              type: "receivedOutput",
              port: "console",
              data: "Loaded libv86.js\n",
            });
          },
          (error) => {
            post({
              type: "receivedOutput",
              port: "console",
              data: `Failed to initialize VM: ${String(error)}\n`,
            });
          },
        );
        break;
      }
      case "pause": {
        void ensureEmulator().then((instance) =>
          instance.stop().then(() => {
            post({
              type: "receivedOutput",
              port: "console",
              data: "VM paused\n",
            });
          }),
        );
        break;
      }
      case "sendPort": {
        void ensureEmulator().then((instance) => {
          const portIndex = portToIndex[data.port];
          instance.bus.send(
            `virtio-console${portIndex}-input-bytes`,
            Array.from(data.data).map((char) => char.charCodeAt(0)),
          );
        });
        break;
      }
      case "resizePort": {
        void ensureEmulator().then((instance) => {
          const portIndex = portToIndex[data.port];
          instance.bus.send(`virtio-console${portIndex}-resize`, [
            data.cols,
            data.rows,
          ]);
        });
        break;
      }
      case "sendFile": {
        void ensureEmulator().then((instance) =>
          instance.create_file(data.name, data.data).then(() => {
            post({
              type: "receivedOutput",
              port: "console",
              data: `Received file ${data.name}\n`,
            });
          }),
        );
        break;
      }
      default:
        break;
    }
  },
);
