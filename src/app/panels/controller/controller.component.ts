import { Component, DestroyRef, ViewChild } from '@angular/core';
import { TerminalComponent } from '../../components/terminal/terminal.component';
import { EmulatorService } from '../../../vm/emulator.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Port } from '../../../utils/literalConstants';

@Component({
  selector: 'app-panel-controller',
  standalone: true,
  imports: [TerminalComponent],
  templateUrl: './controller.component.html',
  styleUrl: './controller.component.scss',
})
export default class ControllerPanel {
  // noinspection JSUnusedGlobalSymbols
  static title = 'Controller Log';

  @ViewChild('terminal')
  private terminal!: TerminalComponent;

  constructor(
    protected emulatorService: EmulatorService,
    destroyRef: DestroyRef,
  ) {
    emulatorService.receivedInput
      .pipe(
        takeUntilDestroyed(destroyRef),
        filter(([port]) => port === Port.Controller),
      )
      .subscribe(([, value]) =>
        this.terminal.write(
          value.replaceAll(/\x00/g, '\n---\n< ').replaceAll('\n', '\r\n'),
        ),
      );
    emulatorService.receivedOutput
      .pipe(
        takeUntilDestroyed(destroyRef),
        filter(([port]) => port === Port.Controller),
      )
      .subscribe(([, value]) =>
        this.terminal.write(
          value
            .replaceAll('\n', '\n< ')
            .replaceAll('\x00', '\n---\n> ')
            .replaceAll('\n', '\r\n'),
        ),
      );
  }
}
