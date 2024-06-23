import { Component, DestroyRef, ViewChild } from '@angular/core';
import { AngularSplitModule } from 'angular-split';
import { EditorComponent } from '../../components/editor/editor.component';
import { TerminalComponent } from '../../components/terminal/terminal.component';
import { EmulatorService } from '../../../vm/emulator.service';
import { ExecutorService } from '../../../vm/executor.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PanelComponent } from '../../components/panel/panel.component';
import { Port } from '../../../utils/literalConstants';

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
    emulator.receivedOutput
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(([port, value]) => {
        switch (port) {
          case Port.Console:
            return this.terminal.write(value);
          case Port.Screen:
            return this.screen.write(value);
          case Port.Controller: //TODO: need feature parity with the old version for controller pretty print
            return this.controller.write(value.replace(/[\u0000\n]/, '\r\n'));
        }
      });
  }

  protected readonly Port = Port;
}
