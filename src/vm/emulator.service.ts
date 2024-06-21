import { EventEmitter, Injectable, Output } from '@angular/core';
import type { WorkerMsgWithoutCID, WorkerResponseMsg } from './emulator.worker';
import { environment } from '../environments/environment';
import { isoUrlSearchParameter } from '../utils/literalConstants';

const encoder = new TextEncoder();

@Injectable({
  providedIn: 'root',
})
export class EmulatorService {
  @Output()
  public resetOutputConsole = new EventEmitter<void>();
  @Output()
  public receivedOutputConsole = new EventEmitter<string>();
  @Output()
  public receivedOutputScreen = new EventEmitter<string>();
  @Output()
  public receivedOutputController = new EventEmitter<string>();

  private worker;

  private asyncCallbacks = new Map<number, Function>();

  constructor() {
    interface FakeWorker {
      new (url: URL): Worker;
    }
    const Worker = function (url: URL) {
      url.searchParams.set(isoUrlSearchParameter, environment.isoUrl);
      return new window.Worker(url);
    } as unknown as FakeWorker;
    this.worker = new Worker(new URL('./emulator.worker', import.meta.url));

    this.worker.onmessage = (event: MessageEvent<WorkerResponseMsg>) => {
      let e = event.data;
      if ('event' in e) {
        if (e.event === 'resetOutputConsole')
          return this.resetOutputConsole.emit();

        return this[e.event].emit(...(e.data ?? []));
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

  public sendTerminal(data: string) {
    this.sendCommand({ command: 'sendTerminal', data });
  }
  public sendScreen(data: string) {
    this.sendCommand({ command: 'sendScreen', data });
  }
  public sendController(data: string) {
    this.sendCommand({ command: 'sendController', data });
  }

  public pause() {
    return this.sendCommandAsync({ command: 'pause' });
  }
  public start() {
    return this.sendCommandAsync({ command: 'start' });
  }
  public sendFile(name: string, content: Uint8Array | string) {
    if (typeof content === 'string') content = encoder.encode(content);
    return this.sendCommandAsync({
      command: 'sendFile',
      name: name,
      data: new Uint8Array(content),
    });
  }
  public resetTerminal() {
    this.sendCommand({ command: 'resetTerminal' });
  }
}
