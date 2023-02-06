import { TypedEmitter } from "tiny-typed-emitter";

export interface EmulatorEvents {
  receivedOutputConsole: (output: string) => void;
  receivedOutputScreen: (output: string) => void;
  receivedOutputController: (output: string) => void;

  sentToController: (output: string) => void;

  resetOutputConsole: () => void;
}

const encoder = new TextEncoder();

class Emulator extends TypedEmitter<EmulatorEvents> {
  private worker = new Worker(new URL("./worker.ts", import.meta.url));

  constructor() {
    super();

    this.worker.onmessage = ({ data: e }) => {
      this.emit(e.event, ...(e.data ?? []));
    };
  }

  public sendTerminal = (data: string) => {
    this.worker.postMessage({ command: "sendTerminal", data });
  };
  public sendScreen = (data: string) => {
    this.worker.postMessage({ command: "sendScreen", data });
  };
  public sendController = (data: string) => {
    this.emit("sentToController", data);
    this.worker.postMessage({ command: "sendController", data });
  };

  public pause = () => {
    this.worker.postMessage({ command: "pause" });
  };

  public start = () => {
    this.worker.postMessage({ command: "start" });
  };

  public sendFile = (
    name: string,
    content: ArrayBuffer | Uint8Array | string,
  ) => {
    if (typeof content === "string") content = encoder.encode(content);
    content = new Uint8Array(content);
    this.worker.postMessage({ command: "sendFile", name: name, data: content });
  };

  public resetTerminal = () => {
    this.worker.postMessage({ command: "resetTerminal" });
  };
}
export const emulator = new Emulator();
