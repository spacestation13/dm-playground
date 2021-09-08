window.emulator = new V86Starter({
    //Emulator binaries
    wasm_path: "lib/v86.wasm",
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
    uart1: true,
    uart2: false,
    uart3: true,
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

    bios: { url: "lib/seabios.bin" },
    vga_bios: { url: "lib/vgabios.bin" },
    cdrom: { url: "lib/byondvm2.iso" },
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
    autostart: false
})

emulator.add_listener("emulator-stopped", function () {
    document.getElementById("speed").textContent = "N/A";
    clearInterval(interval)
    document.getElementById("stop").classList.add("disabled");
    document.getElementById("start").classList.remove("disabled");
    document.getElementById("status").classList.add("bg-danger");
    document.getElementById("status").classList.remove("bg-success");
    document.getElementById("status").textContent = "Stopped";
    window.term.reset()
})
emulator.add_listener("emulator-started", function () {
    if(!collapsed) initTerminal()
    interval = setInterval(update_speed, 1000);
    document.getElementById("stop").classList.remove("disabled");
    document.getElementById("start").classList.add("disabled");
    document.getElementById("status").classList.add("bg-success");
    document.getElementById("status").classList.remove("bg-danger");
    document.getElementById("status").textContent = "Started";
})
