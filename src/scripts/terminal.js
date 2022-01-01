import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit/src/FitAddon";
import { emulator } from "./emulator";

//Initialize terminals
const term = new Terminal({ convertEol: true, logLevel: "off" });
const termSrn = new Terminal({
  convertEol: true,
  logLevel: "off",
  disableStdin: true,
});
const termCtl = new Terminal({ convertEol: true, logLevel: "off" });

//Initialize fit addons
const fitAddon = new FitAddon();
const fitAddonSrn = new FitAddon();
const fitAddonCtl = new FitAddon();

term.loadAddon(fitAddon);
termSrn.loadAddon(fitAddonSrn);
termCtl.loadAddon(fitAddonCtl);

const element = document.getElementById("serialOut");
const elementSrn = document.getElementById("serialOutSrn");
const elementCtl = document.getElementById("serialOutCtl");
console.log(element, elementSrn, elementCtl);

export { term, termSrn, termCtl, fitAddon, fitAddonSrn, fitAddonCtl };
window.terms = { term, termSrn, termCtl, fitAddon, fitAddonSrn, fitAddonCtl };

//Terminal => Emulator
term.onData((data) => emulator.serial0_send(data));
termCtl.onData((data) => {
  if (data === "\r") {
    termCtl.write(data + "\n---\n< ");
    data = "\0";
  } else {
    termCtl.write(data);
  }
  emulator.serial2_send(data);
});

//Emulator => Terminal
emulator.add_listener("serial0-output-char", (chr) => term.write(chr));
emulator.add_listener("serial1-output-char", (chr) => termSrn.write(chr));
emulator.add_listener("serial2-output-char", (chr) => {
  if (chr === "\n") {
    chr = "\n< ";
  }
  if (chr === "\u0000") {
    chr = "\n---\n> ";
  }
  termCtl.write(chr);
});

//Attach terminals
term.open(element);
termSrn.open(elementSrn);
termCtl.open(elementCtl);

emulator.add_listener("emulator-started", () => {
  term.reset();
  term.writeln(
    "This console allows you to interact with the virtual machine that is running BYOND. The virtual machine runs a custom stripped down version of linux. The only installed text editor is `vi`. Run the `resize` command if the terminal size is wrong."
  );
});

emulator.add_listener("emulator-stopped", () => {
  term.reset();
  termSrn.reset();
  termCtl.reset();
});

let resetting = false;
export function resetTerminal() {
  if (!emulator.is_running()) return;
  if (resetting) return;
  resetting = true;
  emulator.v86.cpu.devices.uart0.lsr |= 0b00010000;
  setTimeout(() => {
    emulator.serial0_send(" ");
    setTimeout(() => {
      emulator.v86.cpu.devices.uart0.lsr &= ~0b00010000;
      emulator.serial0_send("k");
      term.reset();
      term.writeln(
        "This console allows you to interact with the virtual machine that is running BYOND. The virtual machine runs a custom stripped down version of linux. The only installed text editor is `vi`. Run the `resize` command if the terminal size is wrong."
      );
      emulator.serial0_send("\n");
      resetting = false;
    }, 1);
  }, 1);
}

//Vars for console tab
let originPoint = null;
let collapsed = true;
let savedSize = window.innerHeight - 350 + "px";

const controlBar = document.getElementById("controlBar");
const consoleTab = document.getElementById("consoleTab");

function startDrag(e) {
  //Ignore events from lower events, only listen to events originating from the bar itself
  if (e.eventPhase === Event.BUBBLING_PHASE) return;
  if (collapsed) return;
  window.origin = e.clientY;
  window.addEventListener("mousemove", moveDrag);
  window.addEventListener("mouseup", endDrag);
}
controlBar.addEventListener("mousedown", startDrag);

function moveDrag(e) {
  const currentDelta = window.innerHeight - consoleTab.offsetHeight;
  consoleTab.style.top = currentDelta + (e.clientY - origin) + "px";
  origin = e.clientY;
}
function endDrag() {
  removeEventListener("mousemove", moveDrag);
  removeEventListener("mouseup", endDrag);
  origin = null;
  reFit();
}

document.getElementById("stop").addEventListener("click", () => {
  emulator.stop();
  emulator.restart();
});
document.getElementById("start").addEventListener("click", () => {
  emulator.run();
});
document.getElementById("pause").addEventListener("click", () => {
  emulator.stop();
});

document.getElementById("toggleConsole").addEventListener("click", () => {
  document.getElementById("collapseConsole").classList.toggle("d-none");
  collapsed = !collapsed;
  if (collapsed) {
    savedSize = consoleTab.style.top;
    consoleTab.style.top = "unset";
  } else {
    resetTerminal();
    consoleTab.style.top = savedSize;
  }
  reFit();
});

emulator.add_listener("emulator-started", () => {
  document.getElementById("stop").classList.remove("disabled");
  document.getElementById("start").classList.add("disabled");
  document.getElementById("status").classList.add("bg-success");
  document.getElementById("status").classList.remove("bg-danger");
  document.getElementById("status").textContent = "Started";
});
emulator.add_listener("emulator-stopped", () => {
  document.getElementById("stop").classList.add("disabled");
  document.getElementById("start").classList.remove("disabled");
  document.getElementById("status").classList.add("bg-danger");
  document.getElementById("status").classList.remove("bg-success");
  document.getElementById("status").textContent = "Stopped";
});
export function reFit() {
  //Why do we need to resize them all to 1x1 before resizing them, BECAUSE IT DOESN'T WORK OTHERWISE AND FUCK YOU I HATE YOU
  term.resize(1, 1);
  fitAddon.fit();
  //For some reason, resizing the terminal moves the cursor 1 character to the left
  term.write(" ");
  termSrn.resize(1, 1);
  fitAddonSrn.fit();
  termCtl.resize(1, 1);
  fitAddonCtl.fit();
  //For some reason, resizing the terminal moves the cursor 1 character to the left
  termCtl.write(" ");
}
