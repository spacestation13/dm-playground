import { TypedEmitter } from "tiny-typed-emitter";
import { once } from "../utils/misc";
import VMWorker from "./worker?worker";
import { WorkerMsgWithoutCID, WorkerResponseMsg } from "./worker";

export type EmulatorEvents = {
  receivedOutputConsole: (output: string) => void;
  receivedOutputScreen: (output: string) => void;
  receivedOutputController: (output: string) => void;

  sentToController: (output: string) => void;

  resetOutputConsole: () => void;
  [key: `async-${number}`]: () => void;
};

const encoder = new TextEncoder();

class Emulator extends TypedEmitter<EmulatorEvents> {
  private worker = new VMWorker();

  constructor() {
    super();

    this.worker.onmessage = (event: MessageEvent<WorkerResponseMsg>) => {
      let e = event.data;
      if ("event" in e) {
        this.emit(e.event, ...(e.data ?? []));
      } else {
        this.emit(`async-${e.commandID}`);
      }
    };
  }

  private nextCommandId = 0;
  private sendCommand(command: WorkerMsgWithoutCID) {
    const commandID = this.nextCommandId++;

    this.worker.postMessage(
      Object.assign(
        {
          commandID: commandID,
        },
        command,
      ),
    );
    return commandID;
  }

  public sendTerminal = (data: string) => {
    this.sendCommand({ command: "sendTerminal", data });
  };

  public sendScreen = (data: string) => {
    this.sendCommand({ command: "sendScreen", data });
  };
  public sendController = (data: string) => {
    this.emit("sentToController", data);
    this.sendCommand({ command: "sendController", data });
  };

  public pause = () =>
    new Promise<void>(resolve => {
      const commandID = this.sendCommand({ command: "pause" });
      this.once(`async-${commandID}`, resolve);
    });

  public start = () =>
    new Promise<void>(resolve => {
      const commandID = this.sendCommand({ command: "start" });
      this.once(`async-${commandID}`, resolve);
    });

  public sendFile = (name: string, content: Uint8Array | string) =>
    new Promise<void>(resolve => {
      if (typeof content === "string") content = encoder.encode(content);
      content = new Uint8Array(content);
      const commandID = this.sendCommand({
        command: "sendFile",
        name: name,
        data: content,
      });
      this.once(`async-${commandID}`, resolve);
    });

  public resetTerminal = () => {
    this.sendCommand({ command: "resetTerminal" });
  };
}
export const emulator = new Emulator();

interface EventSource<T extends string = string> {
  once(eventName: T, handler: Function): any;
}
type T = Emulator extends EventSource<infer U> ? U : never;
const e: T = `async-${2}`;
