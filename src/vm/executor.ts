import CancelablePromise from "cancelable-promise";
import { TypedEmitter } from "tiny-typed-emitter";
import { once } from "../utils/misc";
import { commandQueue } from "./command";
import { emulator } from "./emulator";

type ExecutorEvents = {
  output: (output: string) => void;
  reset: () => void;
};

class Executor extends TypedEmitter<ExecutorEvents> {
  public async executeImmediate(code: string) {
    const filename = `tmp-${Date.now()}`;
    let stageAbort: Function | undefined = undefined;

    this.emit("reset");
    return new CancelablePromise<void>(resolve => {
      console.trace("Starting Emulator");
      resolve(emulator.start());
    })
      .then(() => {
        console.trace("Sending file");
        return emulator.sendFile(filename + ".dme", code);
      })
      .then(() => {
        console.trace("Starting compiler");
        return commandQueue.runProcess(
          "/byond/bin/DreamMaker",
          "/mnt/host/" + filename + ".dme",
          new Map([["LD_LIBRARY_PATH", "/byond/bin"]]),
        );
      })
      .then(compiler => {
        console.trace("Waiting for compiler");
        stageAbort = compiler.kill;
        return once(compiler, "exit");
      })
      .then(() => {
        console.trace("Starting server");
        return commandQueue.runProcess(
          "/byond/bin/DreamDaemon",
          `/mnt/host/${filename}.dmb\0-trusted`,
          new Map([["LD_LIBRARY_PATH", "/byond/bin"]]),
        );
      })
      .then(server => {
        console.trace("Waiting for server");
        server.on("stderr", val => {
          for (const line of val.split("\n")) {
            this.emit("output", line);
          }
        });
        stageAbort = server.kill;
        return once(server, "exit");
      })
      .then(() => {
        stageAbort = undefined;
      })
      .finally(() => {
        if (stageAbort) stageAbort();
        commandQueue.runProcess(
          "/bin/rm",
          `/mnt/host/${filename}.dme\0/mnt/host/${filename}.dmb`,
        );
      }, true);
  }
}

export const executor = new Executor();
