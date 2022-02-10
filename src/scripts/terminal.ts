import { emulator, pause, sendController, sendTerminal } from "./emulator";
import { commandQueue } from "./command";
import {
  fitAddon,
  fitAddonCtl,
  fitAddonSrn,
  term,
  termCtl,
  termSrn,
} from "./terminalDef";

//TODO: remove
window.commandQueue = commandQueue;

window.terms = { term, termSrn, termCtl, fitAddon, fitAddonSrn, fitAddonCtl };

//Terminal => Emulator
term.onData((data) => sendTerminal(data));
termCtl.onData((data) => {
  if (data === "\r") {
    data = "\0";
  }

  sendController(data);
});

//Emulator => Terminal
emulator.add_listener("serial0-output-char", (chr: string) => term.write(chr));
emulator.add_listener("serial1-output-char", (chr: string) =>
  termSrn.write(chr)
);
emulator.add_listener("serial2-output-char", (chr: string) => {
  if (chr === "\n") {
    chr = "\n< ";
  }
  if (chr === "\u0000") {
    chr = "\n---\n> ";
  }
  termCtl.write(chr);
});

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
  const uart0: {
    lsr: number;
    // @ts-ignore typescript doesn't pick up on the dynamically created object
  } = emulator.v86.cpu.devices.uart0;
  uart0.lsr |= 0b00010000;
  setTimeout(() => {
    sendTerminal(" ");
    setTimeout(() => {
      uart0.lsr &= ~0b00010000;
      sendTerminal("k");
      term.reset();
      term.writeln(
        "This console allows you to interact with the virtual machine that is running BYOND. The virtual machine runs a custom stripped down version of linux. The only installed text editor is `vi`. Run the `resize` command if the terminal size is wrong."
      );
      sendTerminal("\n");
      resetting = false;
    }, 1);
  }, 1);
}

//Vars for console tab
let originPoint: number | null = null;
let collapsed = true;
let savedSize = window.innerHeight - 350 + "px";

const controlBar = document.getElementById("controlBar")!;
const consoleTab = document.getElementById("consoleTab")!;

function startDrag(e: MouseEvent) {
  //Ignore events from lower events, only listen to events originating from the bar itself
  if (e.eventPhase === Event.BUBBLING_PHASE) return;
  if (collapsed) return;
  originPoint = e.clientY;
  window.addEventListener("mousemove", moveDrag);
  window.addEventListener("mouseup", endDrag);
}
controlBar.addEventListener("mousedown", startDrag);

function moveDrag(e: MouseEvent) {
  const currentDelta = window.innerHeight - consoleTab.offsetHeight;
  if (originPoint === null) {
    alert("Null origin");
    return;
  }
  consoleTab.style.top = currentDelta + (e.clientY - originPoint) + "px";
  originPoint = e.clientY;
}
function endDrag() {
  removeEventListener("mousemove", moveDrag);
  removeEventListener("mouseup", endDrag);
  originPoint = null;
  reFit();
}

document.getElementById("stop")!.addEventListener("click", () => {
  emulator.stop();
  emulator.restart();
});
document.getElementById("start")!.addEventListener("click", () => {
  emulator.run();
});
document.getElementById("pause")!.addEventListener("click", () => {
  pause();
});

document.getElementById("toggleConsole")!.addEventListener("click", () => {
  document.getElementById("collapseConsole")!.classList.toggle("d-none");
  document.getElementById("controlBar")!.classList.toggle("d-none");
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
  document.getElementById("stop")!.classList.remove("disabled");
  document.getElementById("start")!.classList.add("disabled");
  document.getElementById("status")!.classList.add("bg-success");
  document.getElementById("status")!.classList.remove("bg-danger");
  document.getElementById("status")!.textContent = "Started";
});
emulator.add_listener("emulator-stopped", () => {
  document.getElementById("stop")!.classList.add("disabled");
  document.getElementById("start")!.classList.remove("disabled");
  document.getElementById("status")!.classList.add("bg-danger");
  document.getElementById("status")!.classList.remove("bg-success");
  document.getElementById("status")!.textContent = "Stopped";
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
