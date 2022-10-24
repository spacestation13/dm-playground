import { emulator, sendController } from "./emulator.js";
import { TypedEmitter } from "tiny-typed-emitter";

export interface CommandResultOK<C extends Command> {
  status: "OK";
  result: CommandReturnType<C>;
}
export interface CommandResultErr {
  status: "ERR";
  error: string;
}
export type CommandResult<C extends Command> =
  | CommandResultOK<C>
  | CommandResultErr;

export type CommandReturnType<C extends Command> = C extends SignalCommand
  ? null
  : C extends RunCommand
  ? number
  : C extends PollCommand
  ? PollEvent[]
  : never;

export type Command = SignalCommand | RunCommand | PollCommand;

type QueuedCommand<T extends Command> = T & {
  resultCallback: (result: CommandResult<T>) => unknown;
};

export type PollEvent = ExitPollEvent | StdoutPollEvent | StderrPollEvent;

export interface ExitPollEvent {
  event: "pidexit";
  pid: number;
  exit: number;
}
export interface StdoutPollEvent {
  event: "stdout";
  pid: number;
  data: string;
}
export interface StderrPollEvent {
  event: "stderr";
  pid: number;
  data: string;
}

export interface SignalCommand {
  type: "signal";
  pid: number;
  signal: number;
}

export interface RunCommand {
  type: "run";
  binary: string;
  args: string;
  env: Map<string, string>;
}

export interface PollCommand {
  type: "poll";
}

type SuspendCallbackArray = Array<(suspended: boolean) => void>;

export type ProcessExit =
  | {
      cause: "signal";
      signal: number;
    }
  | {
      cause: "exit";
      code: number;
    }
  | {
      cause: "unknown";
    };

class Process extends TypedEmitter<{
  stdout: (data: string) => unknown;
  stderr: (data: string) => unknown;
  exit: (exit: ProcessExit) => unknown;
}> {
  /**
   * Pid of the tracked process
   * @readonly
   * @type {number}
   */
  public readonly pid: number;
  public killed = false;

  public constructor(pid: number) {
    super();

    this.pid = pid;
  }

  public signal(signal = 15) {
    return commandQueue.queueCommand({
      type: "signal",
      pid: this.pid,
      signal,
    });
  }

  /**
   * Tries to kill the process gracefully, or forcefully after 15 seconds. Promise returns when the process exits.
   * @returns {Promise<CommandResult<SignalCommand>>}
   */
  public kill() {
    return new Promise((resolve, reject) => {
      //Try to terminate gracefully
      this.signal(15)
        .then((res) => {
          //If that failed, return that
          if (res.status === "ERR") return reject(res.error);

          //Resolve when the process exits
          this.on("exit", (exit) => resolve(exit));

          //Otherwise, check back in 15 seconds
          setTimeout(() => {
            //And if we still aren't dead
            if (!this.killed) {
              //Then kill it
              this.signal(9)
                .then((res) => {
                  //If we fail, return that
                  if (res.status === "ERR") reject(res.error);
                })
                //Or an error
                .catch((e) => reject(e));
            }
          }, 15000);
        })
        //An error occured, return that
        .catch((e) => reject(e));
    });
  }
}

/**
 * This singleton serves to track the command queue for the virtual machine controller and to issue new commands.
 */
class CommandQueue {
  public constructor() {
    //It's called from window.setTimeout so this is window otherwise
    this.tickQueue = this.tickQueue.bind(this);
    emulator.add_listener("serial2-output-char", (chr: string) => {
      try {
        this.receiveChr(chr);
      } catch (error) {
        const errorMsg = `The command queue has encountered an error. Please report the following message and reload the page: ${error}`;
        console.log(errorMsg, error);
        alert(errorMsg);
        //We don't really care if suspendQueue errored out, we tried.
        void this.suspendQueue();
        emulator.destroy();
      }
    });
  }

  /**
   * Queue of commands to send to the virtual machine controller
   * @type {QueuedCommand[]}
   */
  private queue: QueuedCommand<Command>[] = [];
  /**
   * Command currently being run. Used to track which callbacks to call
   * @type {Command | null}
   */
  private activeCommand: QueuedCommand<Command> | null = null;
  /**
   * Buffer to hold characters of the returned value as they come in
   * @type {string}
   */
  private resultBuffer: string = "";
  /**
   * true: Queue has been suspended
   *
   * false: Queue has is not suspended
   *
   * (() => void)[]: Array of callbacks to run once the queue has been suspended
   *
   * @type {boolean | (SuspendCallbackArray => void>)[]}
   */
  private queueSuspended: boolean | SuspendCallbackArray = true;

  /**
   * True when the queue loop has been broken because it was empty. If true, {@link #queueCommand} will call {@link #tickQueue} and set it to false.
   * @type {boolean}
   */
  private queueEmpty = true;

  /**
   * Set to true once we receive HELLO. Will cause an error if initialized is true and we receive HELLO again.
   * @type {boolean}
   */
  private initialized = false;

  /**
   * True when {@link #queueSuspended} is an array of callbacks and they are being executed. Used to error if the queue is unsuspended while inside a callback.
   * @type {boolean}
   */
  private suspendingQueue: boolean = false;

  private trackedProcesses = new Map<number, Process>();

  /**
   * Wrapped function for tickQueue. See {@link #tickQueue}
   * @returns {Promise<void>}
   */
  private async _tickQueue(): Promise<void> {
    //Suspend queue is an array, call the callbacks and stop processing
    if (typeof this.queueSuspended !== "boolean") {
      this.suspendingQueue = true;
      this.queueSuspended.forEach((fn) => fn(true));
      this.suspendingQueue = false;
      this.queueSuspended = true;
      return;
    }

    //Queue is suspended
    if (this.queueSuspended) return;

    let command = this.queue.shift();

    //Nothing left on the queue
    if (!command) {
      command = {
        type: "poll",
        resultCallback: () => {},
      };
    }

    let cmdStr;
    switch (command.type) {
      case "signal": {
        const pid = command.pid.toString();
        const signal = command.signal.toString();
        cmdStr = `signal ${pid} ${signal}`;
        break;
      }
      case "run": {
        const binary = btoa(command.binary);
        const args = btoa(command.args);
        let env = "";
        for (let [key, val] of command.env.entries()) {
          key = key.replace(/\\/g, "\\\\");
          key = key.replace(/;/g, "\\;");
          key = key.replace(/=/g, "\\=");
          val = val.replace(/\\/g, "\\\\");
          val = val.replace(/;/g, "\\;");
          val = val.replace(/=/g, "\\=");
          env += `${key}=${val};`;
        }
        cmdStr = `run ${binary} ${args} ${btoa(env)}`;
        break;
      }
      case "poll":
        cmdStr = `poll`;
        break;
      default:
        throw Error("Unknown command");
    }

    this.activeCommand = command;

    sendController(cmdStr + "\0");
  }

  /**
   * Wrapper function for {@link #_tickQueue} that has error handling and rescheduling. This function will process the first element in the queue and call itself again.
   */
  private tickQueue(): void {
    //Break the loop if there's nothing to process
    if (!this.queue.length && !this.trackedProcesses.size) {
      this.queueEmpty = true;
      return;
    }

    this._tickQueue()
      .then(() => setTimeout(this.tickQueue, 300))
      .catch((error) => {
        const errorMsg = `The command queue has encountered an error. Please report the following message and reload the page: ${error}`;
        console.log(errorMsg, error);
        alert(errorMsg);
        //We don't really care if suspendQueue errored out, we tried.
        void this.suspendQueue();
        emulator.destroy();
      });
  }

  /**
   * Appends a character to the result buffer and starts processing the result with {@link #processResult} if the character is a null byte
   * @param chr {string} Character received
   */
  private receiveChr(chr: string) {
    //If the queue is suspended, ignore everything except HELLO
    if (this.initialized && this.queueSuspended) return;

    //Init code
    if (chr === "\0" && this.resultBuffer === "HELLO") {
      if (this.initialized)
        throw Error("Controller initialized twice. It probably crashed.");
      console.log("Controller initialized.");
      this.initialized = true;
      this.resultBuffer = "";
      this.unsuspendQueue();
      return;
    }

    //Null byte marks end of result
    if (chr === "\0") {
      try {
        this.processResult();
      } finally {
        this.activeCommand = null;
        this.resultBuffer = "";
      }
      return;
    }
    this.resultBuffer += chr;
  }

  /**
   * Once a full message excluding the null byte is stored in {@link #resultBuffer}, this function is called to process the buffer and call the appropriate callbacks
   */
  private processResult() {
    if (!this.activeCommand) {
      throw new Error("Received result without any active commands");
    }

    const components = this.resultBuffer.split("\n") as string[];
    const status = components.pop() as string;
    const callback = this.activeCommand.resultCallback;

    if (status === "ERR") {
      const errRes: CommandResultErr = {
        status: "ERR",
        error: components.map(atob).join("\n"),
      };
      callback(errRes);
    } else {
      switch (this.activeCommand.type) {
        case "poll": {
          const res = components.map((pollevent) => {
            const [type, ...pollComponents] = pollevent.split(" ");
            switch (type) {
              case "pidexit": {
                return {
                  event: "pidexit",
                  pid: parseInt(pollComponents[0]),
                  exit: parseInt(pollComponents[1]),
                } as ExitPollEvent;
              }
              case "stderr":
              case "stdout": {
                return {
                  event: type,
                  pid: parseInt(pollComponents[0]),
                  data: atob(pollComponents[1]),
                } as StdoutPollEvent | StderrPollEvent;
              }
              default: {
                throw Error("Unknown event type: " + type);
              }
            }
          }) as PollEvent[];

          res.forEach((pollEvent) => {
            const trackedProcess = this.trackedProcesses.get(pollEvent.pid);
            //Its possible its not a process we track
            if (!trackedProcess) return;
            if (pollEvent.event === "pidexit") {
              if (pollEvent.exit >= 257) {
                trackedProcess.emit("exit", {
                  cause: "signal",
                  signal: pollEvent.exit - 256,
                });
              } else if (pollEvent.exit == 256) {
                trackedProcess.emit("exit", {
                  cause: "unknown",
                });
              } else {
                trackedProcess.emit("exit", {
                  cause: "exit",
                  code: pollEvent.exit,
                });
              }
              trackedProcess.killed = true;
              //Let the rest of the queue run then remove the process
              setTimeout(() => this.trackedProcesses.delete(pollEvent.pid), 0);
            } else {
              trackedProcess.emit(pollEvent.event, pollEvent.data);
            }
          });
          callback({
            status: "OK",
            result: res,
          });
          break;
        }
        case "signal": {
          const res: CommandResultOK<SignalCommand> = {
            status: "OK",
            result: null,
          };
          callback(res);
          break;
        }
        case "run": {
          const pid = parseInt(components[0]);
          const res: CommandResultOK<RunCommand> = {
            status: "OK",
            result: pid,
          };
          this.trackedProcesses.set(pid, new Process(pid));
          callback(res);
          break;
        }
      }
    }
  }

  /**
   * Asynchronous function to suspend the queue, resolves with true if the queue has been suspended or false if it was already suspended. This function cannot be called from a callback to {@link #suspendQueue}
   * @returns {Promise<boolean>} Promise returns true if the queue was suspended or false if it could not be suspended.
   */
  public suspendQueue(): Promise<boolean> {
    if (this.suspendingQueue)
      throw Error("Cannot suspend queue in a callback for suspendQueue");

    console.log("Suspending command queue");
    return new Promise<boolean>((resolve) => {
      if (this.queueSuspended === true) {
        return resolve(false);
      }
      let cbArray: SuspendCallbackArray;
      if (this.queueSuspended === false) {
        cbArray = this.queueSuspended = [];
      } else {
        cbArray = this.queueSuspended;
      }
      cbArray.push((suspended) => {
        console.log("Suspended command queue");
        resolve(suspended);
      });
    });
  }

  /**
   * Function to unsuspend the queue. This function cannot be called from a callback to {@link #suspendQueue}
   */
  public unsuspendQueue() {
    if (this.suspendingQueue)
      throw Error("Cannot unsuspend queue in a callback for suspendQueue");
    if (!this.initialized)
      throw Error("Cannot unsuspend queue before controller is initialized");

    console.log("Unsuspending command queue");
    if (typeof this.queueSuspended !== "boolean") {
      this.suspendingQueue = true;
      this.queueSuspended.forEach((fn) => fn(false));
      this.suspendingQueue = false;
    }
    this.queueSuspended = false;
    console.log("Unsuspended command queue");
    this.tickQueue();
  }

  /**
   * Queue a command to run
   * @param command {Command} Command to run
   * @returns {Promise<number | null | PollEvent[]>} Depending on the type of the command, this can be a number or an array of poll results. Run: pid returned as number. Signal: null. Poll: PollResult[]
   */
  public queueCommand<C extends Command>(
    command: C
  ): Promise<CommandResult<C>> {
    return new Promise((resolve) => {
      const queuedCommand: QueuedCommand<C> = {
        ...command,
        resultCallback: resolve,
      };
      //Since the object is created, we can now turn it into the generic variant
      this.queue.push(queuedCommand as unknown as QueuedCommand<Command>);
      //We added the only element onto the queue and there was no tracked processes, resume the queue loop
      if (this.queueEmpty) {
        this.queueEmpty = false;
        this.tickQueue();
      }
    });
  }

  /**
   * Friendly function to run a process
   * @param path Path of the executable to run
   * @param args Arguments to pass to the executable
   * @param env Map of environment variables
   * @returns {Promise<Process>}
   */
  public async runProcess(
    path: string,
    args = "",
    env = new Map<string, string>()
  ) {
    const result = await this.queueCommand({
      type: "run",
      binary: path,
      args,
      env,
    });
    if (result.status === "ERR")
      throw Error("Failed to created process: " + result.error);

    const trackedProcess = this.trackedProcesses.get(result.result);
    if (!trackedProcess) throw Error("Process was created but not tracked");

    return trackedProcess;
  }
}
const commandQueue = new CommandQueue();

export { commandQueue };
