import { Injectable } from '@angular/core';
import { EmulatorService } from './emulator.service';
import { Process } from './process';
import { Port } from '../utils/literalConstants';
import { firstValueFrom } from 'rxjs';

export interface CommandResultOK<C extends Command> {
  status: 'OK';
  result: CommandReturnType<C>;
}
export interface CommandResultErr {
  status: 'ERR';
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
  event: 'pidexit';
  pid: number;
  exit: number;
}
export interface StdoutPollEvent {
  event: 'stdout';
  pid: number;
  data: string;
}
export interface StderrPollEvent {
  event: 'stderr';
  pid: number;
  data: string;
}

export interface SignalCommand {
  type: 'signal';
  pid: number;
  signal: number;
}

export interface RunCommand {
  type: 'run';
  binary: string;
  args: string;
  env: Map<string, string>;
}

export interface PollCommand {
  type: 'poll';
}

/**
 * This singleton serves to track the command queue for the virtual machine controller and to issue new commands.
 */
@Injectable({
  providedIn: 'root',
})
export class CommandQueueService {
  public constructor(public emulator: EmulatorService) {
    //It's called from window.setTimeout so this is window otherwise
    this.tickQueue = this.tickQueue.bind(this);
    emulator.receivedOutput.subscribe(([port, data]) => {
      if (port != Port.Controller) return;

      for (const chr of data) {
        //TODO: Rewrite the receive function to receive chunks instead of character by character
        try {
          this.receiveChr(chr);
        } catch (error) {
          const errorMsg = `The command queue has encountered an error. Please report the following message and reload the page: ${error}`;
          console.log(errorMsg, error);
          alert(errorMsg);
          this.suspendQueue();
        }
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
  private resultBuffer: string = '';
  /**
   * Queue has errored and quit
   */
  private queueSuspended = false;

  /**
   * True when the queue loop has been broken because it was empty. If true, {@link #queueCommand} will call {@link #tickQueue} and set it to false.
   */
  private queueEmpty = true;

  /**
   * Set to true once we receive HELLO. Will cause an error if initialized is true, and we receive HELLO again.
   */
  private initialized = false;

  private trackedProcesses = new Map<number, Process>();
  private idlePollDelay = 50;

  /**
   * Wrapped function for tickQueue. See {@link #tickQueue}
   * @returns {Promise<void>}
   */
  private async _tickQueue(): Promise<void> {
    //Queue is suspended
    if (this.queueSuspended || !this.initialized) return;

    let command = this.queue.shift();

    //Nothing left on the queue
    if (!command) {
      command = {
        type: 'poll',
        resultCallback: () => {},
      };
    }

    let cmdStr;
    switch (command.type) {
      case 'signal': {
        const pid = command.pid.toString();
        const signal = command.signal.toString();
        cmdStr = `signal ${pid} ${signal}`;
        break;
      }
      case 'run': {
        const binary = btoa(command.binary);
        const args = btoa(command.args);
        let env = '';
        for (let [key, val] of command.env.entries()) {
          key = key.replace(/\\/g, '\\\\');
          key = key.replace(/;/g, '\\;');
          key = key.replace(/=/g, '\\=');
          val = val.replace(/\\/g, '\\\\');
          val = val.replace(/;/g, '\\;');
          val = val.replace(/=/g, '\\=');
          env += `${key}=${val};`;
        }
        cmdStr = `run ${binary} ${args} ${btoa(env)}`;
        break;
      }
      case 'poll':
        cmdStr = `poll`;
        break;
      default:
        throw Error('Unknown command');
    }

    this.activeCommand = command;

    this.emulator.sendPort(Port.Controller, cmdStr + '\0');
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

    this._tickQueue().catch((error) => {
      const errorMsg = `The command queue has encountered an error. Please report the following message and reload the page: ${error}`;
      console.log(errorMsg, error);
      alert(errorMsg);
      this.suspendQueue();
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
    if (chr === '\0' && this.resultBuffer === 'HELLO') {
      if (this.initialized)
        throw Error('Controller initialized twice. It probably crashed.');
      console.debug('Controller initialized.');
      this.emulator.resolveSystemBooted();
      this.initialized = true;
      this.resultBuffer = '';
      this.tickQueue();
      return;
    }

    //Null byte marks end of result
    if (chr === '\0') {
      try {
        this.processResult();
      } finally {
        this.activeCommand = null;
        this.resultBuffer = '';
      }

      if (this.queue.length) {
        this.tickQueue();
      } else {
        if (this.idlePollDelay == -1) {
          this.tickQueue();
        } else {
          setTimeout(this.tickQueue, this.idlePollDelay);
        }
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
      throw new Error('Received result without any active commands');
    }

    const components = this.resultBuffer.split('\n') as string[];
    const status = components.pop() as string;
    const callback = this.activeCommand.resultCallback;

    if (status === 'ERR') {
      const errRes: CommandResultErr = {
        status: 'ERR',
        error: components.map(atob).join('\n'),
      };
      callback(errRes);
    } else {
      switch (this.activeCommand.type) {
        case 'poll': {
          const res = components.map((pollevent) => {
            const [type, ...pollComponents] = pollevent.split(' ');
            switch (type) {
              case 'pidexit': {
                return {
                  event: 'pidexit',
                  pid: parseInt(pollComponents[0]),
                  exit: parseInt(pollComponents[1]),
                } as ExitPollEvent;
              }
              case 'stderr':
              case 'stdout': {
                return {
                  event: type,
                  pid: parseInt(pollComponents[0]),
                  data: atob(pollComponents[1]),
                } as StdoutPollEvent | StderrPollEvent;
              }
              default: {
                throw Error('Unknown event type: ' + type);
              }
            }
          }) as PollEvent[];

          res.forEach((pollEvent) => {
            const trackedProcess = this.trackedProcesses.get(pollEvent.pid);
            //Its possible it's not a process we track
            if (!trackedProcess) return;
            if (pollEvent.event === 'pidexit') {
              if (pollEvent.exit >= 257) {
                trackedProcess.exit.emit({
                  cause: 'signal',
                  signal: pollEvent.exit - 256,
                });
              } else if (pollEvent.exit == 256) {
                trackedProcess.exit.emit({
                  cause: 'unknown',
                });
              } else {
                trackedProcess.exit.emit({
                  cause: 'exit',
                  code: pollEvent.exit,
                });
              }
              trackedProcess.unsubscribe();
              trackedProcess.killed = true;
              this.trackedProcesses.delete(pollEvent.pid);
            } else {
              trackedProcess[pollEvent.event].emit(pollEvent.data);
            }
          });
          callback({
            status: 'OK',
            result: res,
          });
          break;
        }
        case 'signal': {
          const res: CommandResultOK<SignalCommand> = {
            status: 'OK',
            result: null,
          };
          callback(res);
          break;
        }
        case 'run': {
          const pid = parseInt(components[0]);
          const res: CommandResultOK<RunCommand> = {
            status: 'OK',
            result: pid,
          };
          this.trackedProcesses.set(pid, new Process(pid, this));
          callback(res);
          break;
        }
      }
    }
  }

  private suspendQueue() {
    console.debug('Suspended command queue');
    this.queueSuspended = true;
  }

  /**
   * Queue a command to run
   * @param command {Command} Command to run
   * @returns {Promise<number | null | PollEvent[]>} Depending on the type of the command, this can be a number or an array of poll results. Run: pid returned as number. Signal: null. Poll: PollResult[]
   */
  public queueCommand<C extends Command>(
    command: C,
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
   * @return {Promise<Process>}
   */
  public async runProcess(
    path: string,
    args = '',
    env = new Map<string, string>(),
  ): Promise<Process> {
    const result = await this.queueCommand({
      type: 'run',
      binary: path,
      args,
      env,
    });
    if (result.status === 'ERR')
      throw Error('Failed to created process: ' + result.error);

    const trackedProcess = this.trackedProcesses.get(result.result);
    if (!trackedProcess) throw Error('Process was created but not tracked');

    return trackedProcess;
  }

  public async runToCompletion(...args: Parameters<typeof this.runProcess>) {
    let process = await this.runProcess(...args);
    let exit = await firstValueFrom(process.exit);
    if (exit.cause == 'exit' && exit.code != 0)
      throw new Error('Process exited abnormally: exit code ' + exit.code, {
        cause: exit,
      });
    return exit;
  }

  public async runToSuccess(...args: Parameters<typeof this.runProcess>) {
    let exit = await this.runToCompletion(...args);
    if (exit.cause == 'exit' && exit.code != 0)
      throw new Error('Process exited abnormally: exit code ' + exit.code, {
        cause: exit,
      });
    return exit;
  }
}
