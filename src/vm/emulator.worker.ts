/// <reference lib="webworker" />
import { vmRemoteUrlSearchParameter } from '../utils/literalConstants';

importScripts('./lib/libv86.js');

interface MsgSendTerminal {
  command: 'sendTerminal';
  data: string;
}
interface MsgSendScreen {
  command: 'sendScreen';
  data: string;
}
interface MsgSendController {
  command: 'sendController';
  data: string;
}
interface MsgStart {
  command: 'start';
  data?: undefined;
}
interface MsgPause {
  command: 'pause';
  data?: undefined;
}
interface MsgSendFile {
  command: 'sendFile';
  name: string;
  data: Uint8Array;
}
interface MsgResetTerminal {
  command: 'resetTerminal';
  data?: undefined;
}

export type WorkerMsgWithoutCID =
  | MsgSendTerminal
  | MsgSendScreen
  | MsgSendController
  | MsgStart
  | MsgPause
  | MsgSendFile
  | MsgResetTerminal;

export type WorkerMsg = WorkerMsgWithoutCID & {
  commandID: number;
};

export type WorkerResponseMsg =
  | {
      command: 'asyncResponse';
      commandID: number;
    }
  | WorkerEventResponseMsg;

export type WorkerEventResponseMsg =
  | {
      event: 'receivedOutputConsole';
      data: [string];
    }
  | {
      event: 'receivedOutputScreen';
      data: [string];
    }
  | {
      event: 'receivedOutputController';
      data: [string];
    }
  | {
      event: 'resetOutputConsole';
      data: void;
    };

const decoder = new TextDecoder();
const parameters = new URLSearchParams(location.search);
const emulator = new V86({
  //Emulator binaries
  wasm_path: 'lib/v86.wasm',
  //Hell is this?
  acpi: true,

  //Log level, debugging?
  log_level: 0,
  //128MB of ram
  memory_size: 128 * 1024 * 1024,
  //8MB of video ram
  vga_memory_size: 8 * 1024 * 1024,
  //CD / Floppy / HD
  boot_order: 0x213,
  //Skips boot menu delay on boch BIOS apparently
  fastboot: true,
  //From my understanding, these control serial terminals
  uart1: true, //Terminal
  uart2: true, //Screen
  uart3: true, //Controller
  //Used for weird ass automatic kernel image loading
  cmdline: null,
  //Presumably saves the mac address in the state
  preserve_mac_from_state_image: true,
  //Instance of NetworkAdapter
  network_adapter: null,
  //URL to websocket proxy (wss://relay.widgetry.org/)
  network_relay_url: null,
  disable_keyboard: true,
  disable_mouse: true,
  //Canvas element
  screen_container: null,
  //Fake screen
  screen_dummy: false,
  //Textarea element
  serial_container: null,
  //Div element
  serial_container_xtermjs: null,
  disable_speaker: true,
  //Images:
  /**
   * Can be an object implementing get(), set() and load() or
   * {
   *     buffer: ArrayBuffer | File,
   *     async: boolean | undefined, //Defaults to true if size is over 256M
   *     url: string, //if buffer is not set, url to load image from
   *     size: number, //required for async, not sure for sync urls
   *     use_parts: boolean //used for split up images
   * }
   */

  bios: {
    url: 'https://raw.githubusercontent.com/copy/v86/master/bios/seabios.bin',
  },
  vga_bios: {
    url: 'https://raw.githubusercontent.com/copy/v86/master/bios/vgabios.bin',
  },
  cdrom: null,
  hda: null,
  hdb: null,
  fda: null,
  fdb: null,
  initial_state: null,
  multiboot: null,
  bzimage: {
    url: parameters.get(vmRemoteUrlSearchParameter) + 'bzImage',
  },
  initrd: {
    url: parameters.get(vmRemoteUrlSearchParameter) + 'rootfs.cpio.lz4',
    async: true,
  },
  //9p filesystem, { basefs: string, baseurl: string } or {}
  filesystem: {},
  //Loads bzimage and initrd from 9p filesystem
  bzimage_initrd_from_filesystem: false,
  autostart: true,
  virtio_console: true,
});

//@ts-ignore
self.emulator = emulator;

let resetting = false;

function sendTerminal(message: string) {
  emulator.bus.send(
    'virtio-console0-input-bytes',
    [...message].map((x) => x.charCodeAt(0)),
  );
}
function sendScreen(message: string) {
  emulator.bus.send(
    'virtio-console1-input-bytes',
    [...message].map((x) => x.charCodeAt(0)),
  );
}
function sendController(message: string) {
  emulator.bus.send(
    'virtio-console2-input-bytes',
    [...message].map((x) => x.charCodeAt(0)),
  );
}
onmessage = ({ data: e }: MessageEvent<WorkerMsg>) => {
  switch (e.command) {
    case 'sendTerminal': {
      sendTerminal(e.data);
      break;
    }
    case 'sendScreen': {
      sendScreen(e.data);
      break;
    }
    case 'sendController': {
      sendController(e.data);
      break;
    }
    case 'start': {
      emulator.run().then(() => {
        postMessage({
          command: 'asyncResponse',
          commandID: e.commandID,
        } satisfies WorkerResponseMsg);
      });
      break;
    }
    case 'pause': {
      emulator.stop().then(() => {
        postMessage({
          command: 'asyncResponse',
          commandID: e.commandID,
        } satisfies WorkerResponseMsg);
      });
      break;
    }
    case 'sendFile': {
      emulator.create_file(e.name, e.data).then(() => {
        postMessage({
          command: 'asyncResponse',
          commandID: e.commandID,
        } satisfies WorkerResponseMsg);
      });
      break;
    }
    case 'resetTerminal': {
      if (!emulator.is_running()) return;
      if (resetting) return;
      resetting = true;
      const uart0: {
        lsr: number;
      } = emulator.v86.cpu.devices.uart0;
      uart0.lsr |= 0b00010000;
      setTimeout(() => {
        sendTerminal(' ');
        setTimeout(() => {
          uart0.lsr &= ~0b00010000;
          sendTerminal('k');
          postMessage({ event: 'resetOutputConsole' });
          sendTerminal('\n');
          resetting = false;
        }, 1);
      }, 1);
    }
  }
};

emulator.add_listener('virtio-console0-output-bytes', (bytes: Uint8Array) => {
  postMessage({
    event: 'receivedOutputConsole',
    data: [decoder.decode(bytes)],
  });
});
emulator.add_listener('virtio-console1-output-bytes', (bytes: Uint8Array) => {
  postMessage({
    event: 'receivedOutputScreen',
    data: [decoder.decode(bytes)],
  });
});
emulator.add_listener('virtio-console2-output-bytes', (bytes: Uint8Array) => {
  postMessage({
    event: 'receivedOutputController',
    data: [decoder.decode(bytes)],
  });
});
