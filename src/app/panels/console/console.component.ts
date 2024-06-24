import { Component, DestroyRef, ViewChild } from '@angular/core';
import { Port } from '../../../utils/literalConstants';
import { TerminalComponent } from '../../components/terminal/terminal.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmulatorService } from '../../../vm/emulator.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-panel-console',
  standalone: true,
  imports: [TerminalComponent],
  templateUrl: './console.component.html',
  styleUrl: './console.component.scss',
})
export default class ConsolePanel {
  // noinspection JSUnusedGlobalSymbols
  static title = 'Console';
  protected readonly Port = Port;

  @ViewChild('terminal')
  private terminal!: TerminalComponent;

  constructor(
    protected emulatorService: EmulatorService,
    destroyRef: DestroyRef,
  ) {
    emulatorService.receivedOutput
      .pipe(
        takeUntilDestroyed(destroyRef),
        filter(([port]) => port === Port.Console),
      )
      .subscribe(([, value]) => this.terminal.write(value));
  }
}
