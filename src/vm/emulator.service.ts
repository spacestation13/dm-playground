import { EventEmitter, Injectable, Output } from '@angular/core';
import type {
  MsgSendPort,
  WorkerMsgWithoutCID,
  WorkerResponseMsg,
} from './emulator.worker';
import { environment } from '../environments/environment';
import { Port, vmRemoteUrlSearchParameter } from '../utils/literalConstants';

const encoder = new TextEncoder();

@Injectable({
  providedIn: 'root',
})
export class EmulatorService {
  @Output()
  public resetOutputConsole = new EventEmitter<void>();
  @Output()
  public receivedOutput = new EventEmitter<[Port, string]>();

  private worker;

  private asyncCallbacks = new Map<number, Function>();

  constructor() {
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
    this.sendCommand({ command: 'sendPort', data });
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
}
