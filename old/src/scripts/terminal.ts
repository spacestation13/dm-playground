import { emulator, pause, sendController, sendTerminal } from "./emulator.js";
import { commandQueue } from "./command.js";
import {
  fitAddon,
  fitAddonCtl,
  fitAddonSrn,
  term,
  termCtl,
  termSrn,
} from "./terminalDef.js";

//TODO: remove
window.commandQueue = commandQueue;

window.terms = { term, termSrn, termCtl, fitAddon, fitAddonSrn, fitAddonCtl };

//Terminal => Emulator


//Emulator => Terminal


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

//Vars for console tab
let originPoint: number | null = null;
let collapsed = true;
let savedSize = window.innerHeight - 350 + "px";



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