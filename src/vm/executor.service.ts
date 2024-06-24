import CancelablePromise from 'cancelable-promise';
import { EventEmitter, Injectable, Output } from '@angular/core';
import { CommandQueueService } from './commandQueue.service';
import { EmulatorService } from './emulator.service';
import { once } from '../utils/misc';

@Injectable({
  providedIn: 'root',
})
export class ExecutorService {
  @Output()
  public output = new EventEmitter<string>();
  @Output()
  public reset = new EventEmitter<void>();

  constructor(
    private commandQueue: CommandQueueService,
    private emulator: EmulatorService,
  ) {}

  public async executeImmediate(
    code: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const filename = `tmp-${Date.now()}`;
    let stageAbort: Function | undefined = undefined;

    this.reset.emit();
    const promise = new CancelablePromise<void>((resolve) => {
      resolve(this.emulator.start());
    })
      .then(() => {
        return this.emulator.sendFile(filename + '.dme', code);
      })
      .then(() => {
        return this.commandQueue.runProcess(
          '/byond/bin/DreamMaker',
          '/mnt/host/' + filename + '.dme',
          new Map([['LD_LIBRARY_PATH', '/byond/bin']]),
        );
      })
      .then((compiler) => {
        this.output.emit('=== Compile stage ===\n');
        compiler.stdout.subscribe((val) => this.output.emit(val));
        stageAbort = compiler.kill;
        return once(compiler.exit);
      })
      .then(() => {
        return this.commandQueue.runProcess(
          '/byond/bin/DreamDaemon',
          `/mnt/host/${filename}.dmb\0-trusted`,
          new Map([['LD_LIBRARY_PATH', '/byond/bin']]),
        );
      })
      .then((server) => {
        this.output.emit('\n=== Run stage ===\n');
        server.stderr.subscribe((val) => this.output.emit(val));
        stageAbort = server.kill;
        return once(server.exit);
      })
      .then(() => {
        stageAbort = undefined;
      })
      .finally(() => {
        if (stageAbort) stageAbort();
        this.commandQueue.runProcess(
          '/bin/rm',
          `/mnt/host/${filename}.dme\0/mnt/host/${filename}.dmb`,
        );
      }, true);

    signal?.addEventListener('abort', () => promise.cancel());
    return promise;
  }
}
