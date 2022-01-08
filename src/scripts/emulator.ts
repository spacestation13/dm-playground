import wasmUrl from "../static/lib/v86.wasm?url";
import biosUrl from "../static/lib/seabios.bin?url";
import vgaBiosUrl from "../static/lib/vgabios.bin?url";
import isoUrl from "../static/controller.iso?url";
import { termCtl } from "./terminalDef";

let emulator: V86Starter;

//Hyper fuck you code, pretends to accept HMR but does NOTHING
if (import.meta.hot) {
  import.meta.hot.accept(() => {});
  if (!import.meta.hot.data.alreadyInit) {
    import.meta.hot.data.alreadyInit = true;
    createEmulator();
  }
} else {
  createEmulator();
}

function createEmulator() {
  emulator = new V86Starter({
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
    screen_container: document.getElementById("screenOut"),
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

    bios: { url: biosUrl },
    vga_bios: { url: vgaBiosUrl },
    cdrom: { url: isoUrl },
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
}

const sendTerminal = function (data: string) {
  for (let i = 0; i < data.length; i++) {
    emulator.bus.send("serial0-input", data.charCodeAt(i));
  }
};
const sendScreen = function (data: string) {
  for (let i = 0; i < data.length; i++) {
    emulator.bus.send("serial1-input", data.charCodeAt(i));
  }
};
const sendController = function (data: string) {
  termCtl.write(data.replace(/\x00/g, "\n---\n< "));
  for (let i = 0; i < data.length; i++) {
    emulator.bus.send("serial2-input", data.charCodeAt(i));
  }
};

function pause() {
  emulator.stop();
}

function unpause() {
  emulator.run();
}

export { emulator, pause, unpause, sendController, sendScreen, sendTerminal };
