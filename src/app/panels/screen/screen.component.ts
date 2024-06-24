import { Component, DestroyRef, ViewChild } from '@angular/core';
import { TerminalComponent } from '../../components/terminal/terminal.component';
import { EmulatorService } from '../../../vm/emulator.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Port } from '../../../utils/literalConstants';

@Component({
  selector: 'app-panel-screen',
  standalone: true,
  imports: [TerminalComponent],
  templateUrl: './screen.component.html',
  styleUrl: './screen.component.scss',
})
export default class ScreenPanel {
  // noinspection JSUnusedGlobalSymbols
  static title = 'Screen Log';

  @ViewChild('terminal')
  private terminal!: TerminalComponent;

  constructor(
    protected emulatorService: EmulatorService,
    destroyRef: DestroyRef,
  ) {
    emulatorService.receivedOutput
      .pipe(
        takeUntilDestroyed(destroyRef),
        filter(([port]) => port === Port.Screen),
      )
      .subscribe(([, value]) => this.terminal.write(value));
  }
}
