import { Component, DestroyRef } from '@angular/core';
import { ExecutorService } from '../../../vm/executor.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-panel-output',
  standalone: true,
  imports: [],
  templateUrl: './output.component.html',
  styleUrl: './output.component.scss',
})
export default class OutputPanel {
  // noinspection JSUnusedGlobalSymbols
  static title = 'Output';

  protected output = '';

  constructor(
    private executorService: ExecutorService,
    private destroyRef: DestroyRef,
  ) {
    executorService.reset.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => {
      this.output = '';
    });
    this.executorService.output
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.output += value;
      });
  }
}
