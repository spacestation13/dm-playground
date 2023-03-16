import wasmUrl from "../lib/v86.wasm?url";
//import isoUrl from "val-loader!../../fetchIso.js?raw";
import isoUrl from "../../../buildroot/output/images/rootfs.iso9660?url";

self.importScripts = () => {};

import "../lib/libv86.js";

interface MsgSendTerminal {
  command: "sendTerminal";
  data: string;
}
interface MsgSendScreen {
  command: "sendScreen";
  data: string;
}
interface MsgSendController {
  command: "sendController";
  data: string;
}
interface MsgStart {
  command: "start";
  data?: undefined;
}
interface MsgPause {
  command: "pause";
  data?: undefined;
}
interface MsgSendFile {
  command: "sendFile";
  name: string;
  data: Uint8Array;
}
interface MsgResetTerminal {
  command: "resetTerminal";
  data?: undefined;
}

type WorkerMsg =
  | MsgSendTerminal
  | MsgSendScreen
  | MsgSendController
  | MsgStart
  | MsgPause
  | MsgSendFile
  | MsgResetTerminal;

const emulator = new V86Starter({
  //Emulator binaries
  wasm_path: wasmUrl,
  //Hell is this?
  acpi: false,

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
    url: "https://raw.githubusercontent.com/copy/v86/master/bios/seabios.bin",
  },
  vga_bios: {
    url: "https://raw.githubusercontent.com/copy/v86/master/bios/vgabios.bin",
  },
  cdrom: {
    url: isoUrl,
  },
  hda: null,
  hdb: null,
  fda: null,
  fdb: null,
  initial_state: null,
  multiboot: null,
  bzimage: null,
  initrd: null,
  //9p filesystem, { basefs: string, baseurl: string } or {}
  filesystem: {},
  //Loads bzimage and initrd from 9p filesystem
  bzimage_initrd_from_filesystem: false,
  autostart: false,
});

let resetting = false;

function sendTerminal(message: string) {
  for (let i = 0; i < message.length; i++) {
    emulator.bus.send("serial0-input", message.charCodeAt(i));
  }
}
function sendScreen(message: string) {
  for (let i = 0; i < message.length; i++) {
    emulator.bus.send("serial1-input", message.charCodeAt(i));
  }
}
function sendController(message: string) {
  for (let i = 0; i < message.length; i++) {
    emulator.bus.send("serial2-input", message.charCodeAt(i));
  }
}
onmessage = async ({ data: e }: MessageEvent<WorkerMsg>) => {
  switch (e.command) {
    case "sendTerminal": {
      sendTerminal(e.data);
      break;
    }
    case "sendScreen": {
      sendScreen(e.data);
      break;
    }
    case "sendController": {
      sendController(e.data);
      break;
    }
    case "start": {
      await emulator.run();
      break;
    }
    case "pause": {
      await emulator.stop();
      break;
    }
    case "sendFile": {
      await emulator.create_file(e.name, e.data);
      break;
    }
    case "resetTerminal": {
      if (!emulator.is_running()) return;
      if (resetting) return;
      resetting = true;
      const uart0: {
        lsr: number;
      } = emulator.v86.cpu.devices.uart0;
      uart0.lsr |= 0b00010000;
      setTimeout(() => {
        sendTerminal(" ");
        setTimeout(() => {
          uart0.lsr &= ~0b00010000;
          sendTerminal("k");
          self.postMessage({ event: "resetOutputConsole" });
          sendTerminal("\n");
          resetting = false;
        }, 1);
      }, 1);
    }
  }
};

emulator.add_listener("serial0-output-char", (chr: string) =>
  self.postMessage({ event: "receivedOutputConsole", data: [chr] }),
);
emulator.add_listener("serial1-output-char", (chr: string) =>
  self.postMessage({ event: "receivedOutputScreen", data: [chr] }),
);
emulator.add_listener("serial2-output-char", (chr: string) =>
  self.postMessage({ event: "receivedOutputController", data: [chr] }),
);
