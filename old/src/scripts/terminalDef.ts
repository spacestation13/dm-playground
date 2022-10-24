//Initialize terminals
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit/src/FitAddon";

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

const element = document.getElementById("serialOut")!;
const elementSrn = document.getElementById("serialOutSrn")!;
const elementCtl = document.getElementById("serialOutCtl")!;

//Attach terminals
term.open(element);
termSrn.open(elementSrn);
termCtl.open(elementCtl);

export { fitAddonCtl };
export { fitAddonSrn };
export { fitAddon };
export { termCtl };
export { termSrn };
export { term };
