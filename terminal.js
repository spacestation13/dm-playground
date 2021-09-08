const term = window.term = new window.Terminal();
const fitAddon = new window.FitAddon.FitAddon();
term.loadAddon(fitAddon)
term.setOption("logLevel", "off");

term.onData(function(data) {
    emulator.serial0_send(data);
});

emulator.add_listener("serial0-output-char", function(chr) {
    term.write(chr);
});


const element = document.getElementById("serialOut");
term.open(element);

let resetting = false;
window.initTerminal = function() {
    if(resetting) return;
    resetting = true;
    fitAddon.fit();
    emulator.v86.cpu.devices.uart0.lsr |= 0b00010000;
    window.setTimeout(() => {
        emulator.v86.cpu.devices.uart0.lsr &= ~0b00010000;
        window.setTimeout(() => {
            emulator.serial0_send(" k")
            window.setTimeout(() => {
                term.reset();
                term.writeln("This console allows you to interact with the virtual machine that is running BYOND. The virtual machine runs a custom stripped down version of linux. The only installed text editor is `vi`. Run the `resize` command if the terminal size is wrong.");
                emulator.serial0_send("\n");
                resetting = false
            }, 200)
        }, 200)
    }, 200)
}

new ResizeObserver(() => !collapsed && origin === null ? fitAddon.fit() : null).observe(element)
