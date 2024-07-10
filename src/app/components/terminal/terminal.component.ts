import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalDimensions } from '../../../vm/emulator.service';

@Component({
  selector: 'app-terminal',
  standalone: true,
  imports: [],
  templateUrl: './terminal.component.html',
  styleUrl: './terminal.component.scss',
})
export class TerminalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('terminal')
  private container!: ElementRef<HTMLDivElement>;

  @Output()
  public input = new EventEmitter<string>();
  @Output()
  public resize = new EventEmitter<TerminalDimensions>();

  private terminal = new Terminal();
  private fitAddon = new FitAddon();
  private observer = new ResizeObserver(() => this.fit());

  constructor() {
    this.terminal.onData((value) => this.input.emit(value));
    this.terminal.loadAddon(this.fitAddon);
  }

  public write(value: string) {
    this.terminal.write(value);
  }

  private fit() {
    this.fitAddon.fit();
    const dimensions = this.fitAddon.proposeDimensions();
    if (!dimensions) {
      console.warn('Cannot resolve dimensions');
      return;
    }

    this.resize.emit(dimensions);
  }

  ngAfterViewInit(): void {
    this.terminal.open(this.container.nativeElement);
    this.observer.observe(this.container.nativeElement);
    this.fit();
  }

  ngOnDestroy(): void {
    this.terminal.dispose();
    this.observer.disconnect();
  }
}
