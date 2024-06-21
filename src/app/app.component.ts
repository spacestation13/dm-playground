import {
  TuiAlertModule,
  TuiButtonModule,
  TuiDialogModule,
  TuiRootModule,
} from '@taiga-ui/core';
import { Component, DestroyRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ExecutorService } from '../vm/executor.service';
import { EditorComponent } from './components/editor/editor.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmulatorService } from '../vm/emulator.service';
import { TerminalComponent } from './components/terminal/terminal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    TuiRootModule,
    TuiDialogModule,
    TuiAlertModule,
    TuiButtonModule,
    EditorComponent,
    TerminalComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  @ViewChild('terminal')
  private terminal!: TerminalComponent;
  protected output = '';
  protected controllerLog = '';
  protected screenLog = '';

  constructor(
    protected emulator: EmulatorService,
    executor: ExecutorService,
    destroyRef: DestroyRef,
  ) {
    executor.output.pipe(takeUntilDestroyed(destroyRef)).subscribe((value) => {
      this.output += value;
    });
    emulator.receivedOutputScreen
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((value) => {
        this.screenLog += value;
      });
    emulator.receivedOutputController
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((value) => {
        this.controllerLog += value;
      });

    emulator.receivedOutputConsole
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((value) => {
        this.terminal.write(value);
      });
  }
}
