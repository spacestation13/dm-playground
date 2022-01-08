import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit/src/FitAddon";

declare global {
  interface Window {
    terms: Record<string, Terminal | FitAddon>;
    commandQueue: commandQueue;
  }
}
