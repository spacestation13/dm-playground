import { EventEmitter } from '@angular/core';
import {
  CommandQueueService,
  CommandResult,
  SignalCommand,
} from './commandQueue.service';

export type ProcessExit =
  | {
      cause: 'signal';
      signal: number;
    }
  | {
      cause: 'exit';
      code: number;
    }
  | {
      cause: 'unknown';
    };

export class Process {
  public stdout = new EventEmitter<string>();
  public stderr = new EventEmitter<string>();
  public exit = new EventEmitter<ProcessExit>();

  public killed = false;

  /**
   * @param pid Pid of the tracked process
   * @param commandQueue
   */
  public constructor(
    public readonly pid: number,
    private readonly commandQueue: CommandQueueService,
  ) {}

  public signal(signal = 15) {
    return this.commandQueue.queueCommand({
      type: 'signal',
      pid: this.pid,
      signal,
    });
  }

  /**
   * Tries to kill the process gracefully, or forcefully after 15 seconds. Promise returns when the process exits.
   */
  public kill(): Promise<CommandResult<SignalCommand>> {
    return new Promise((resolve, reject) => {
      //Try to terminate gracefully
      this.signal(15)
        .then((res) => {
          //If that failed, return that
          if (res.status === 'ERR') return reject(res.error);

          //Resolve when the process exits
          this.exit.subscribe(() => resolve({ status: 'OK', result: null }));

          //Otherwise, check back in 15 seconds
          setTimeout(() => {
            //And if we still aren't dead
            if (!this.killed) {
              //Then kill it
              this.signal(9)
                .then((res) => {
                  //If we fail, return that
                  if (res.status === 'ERR') reject(res.error);
                })
                //Or an error
                .catch((e) => reject(e));
            }
          }, 15000);
        })
        //An error occurred, return that
        .catch((e) => reject(e));
    });
  }

  public unsubscribe() {
    this.stdout.unsubscribe();
    this.stderr.unsubscribe();
    this.exit.unsubscribe();
  }
}
