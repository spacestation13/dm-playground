import { EventEmitter, Injectable, Output } from '@angular/core';
import type {
  MsgResizePort,
  MsgSendPort,
  WorkerMsgWithoutCID,
  WorkerResponseMsg,
} from './emulator.worker';
import { environment } from '../environments/environment';
import { Port, vmRemoteUrlSearchParameter } from '../utils/literalConstants';

export interface TerminalDimensions {
  rows: number;
  cols: number;
}

const encoder = new TextEncoder();

@Injectable({
  providedIn: 'root',
})
export class EmulatorService {
  @Output()
  public readonly resetOutputConsole = new EventEmitter<void>();
  @Output()
  public readonly receivedOutput = new EventEmitter<[Port, string]>();
  @Output()
  public readonly receivedInput = new EventEmitter<[Port, string]>();

  private readonly worker;

  private readonly asyncCallbacks = new Map<number, Function>();

  public resolveSystemBooted!: Function;
  public readonly systemBooted = new Promise<void>(
    (resolve) => (this.resolveSystemBooted = resolve),
  );

  private readonly savedDimensions = new Map<Port, TerminalDimensions>();

  constructor() {
    this.systemBooted.then(() => {
      for (const [port, dims] of this.savedDimensions) {
        this.resizePort(port, dims);
      }
    });

    interface FakeWorker {
      new (url: URL): Worker;
    }
    const Worker = function (url: URL) {
      url.searchParams.set(vmRemoteUrlSearchParameter, environment.vmSourceUrl);
      return new window.Worker(url);
    } as unknown as FakeWorker;
    this.worker = new Worker(new URL('./emulator.worker', import.meta.url));

    this.worker.onmessage = (event: MessageEvent<WorkerResponseMsg>) => {
      let e = event.data;
      if ('event' in e) {
        if (e.event === 'resetOutputConsole')
          return this.resetOutputConsole.emit();

        return this[e.event].emit(e.data);
      }

      const callback = this.asyncCallbacks.get(e.commandID);
      if (callback == null)
        return console.warn(`Unknown command ID: ${e.commandID}`);
      callback();
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

  private sendCommandAsync(command: WorkerMsgWithoutCID): Promise<void> {
    return new Promise((resolve) =>
      this.asyncCallbacks.set(this.sendCommand(command), resolve),
    );
  }

  public sendPort(...data: MsgSendPort['data']) {
    this.receivedInput.emit(data);
    this.sendCommand({ command: 'sendPort', data });
  }
  public resizePort(...data: MsgResizePort['data']) {
    this.savedDimensions.set(data[0], data[1]);
    this.sendCommand({ command: 'resizePort', data });
  }
  public pause() {
    return this.sendCommandAsync({ command: 'pause' });
  }
  public start() {
    this.sendCommand({ command: 'start' });
    return this.systemBooted;
  }
  public sendFile(name: string, content: Uint8Array | string) {
    if (typeof content === 'string') content = encoder.encode(content);
    return this.sendCommandAsync({
      command: 'sendFile',
      name: name,
      data: new Uint8Array(content),
    });
  }
}
