import { Component, DestroyRef, ViewChild } from '@angular/core';
import { AngularSplitModule } from 'angular-split';
import { EditorComponent } from '../../components/editor/editor.component';
import { TerminalComponent } from '../../components/terminal/terminal.component';
import { EmulatorService } from '../../../vm/emulator.service';
import { ExecutorService } from '../../../vm/executor.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PanelComponent } from '../../components/panel/panel.component';

@Component({
  selector: 'app-editor-page',
  standalone: true,
  imports: [
    AngularSplitModule,
    EditorComponent,
    TerminalComponent,
    PanelComponent,
  ],
  templateUrl: './editor-page.component.html',
  styleUrl: './editor-page.component.scss',
})
export class EditorPageComponent {
  @ViewChild('terminal')
  private terminal!: TerminalComponent;
  @ViewChild('controller')
  private controller!: TerminalComponent;
  @ViewChild('screen')
  private screen!: TerminalComponent;
  protected output = '';

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
        this.screen.write(value);
      });
    emulator.receivedOutputController //TODO: need feature parity with the old version
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((value) => {
        this.controller.write(value.replace(/[\u0000\n]/, '\r\n'));
      });

    emulator.receivedOutputConsole
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((value) => {
        this.terminal.write(value);
      });
  }
}
