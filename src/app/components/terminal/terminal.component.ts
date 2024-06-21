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
import { FitAddon } from 'xterm-addon-fit';

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

  private terminal = new Terminal();
  private fit = new FitAddon();
  private observer = new ResizeObserver(() => {
    this.fit.fit();
  });

  constructor() {
    this.terminal.onData((value) => this.input.emit(value));
    this.terminal.loadAddon(this.fit);
  }

  public write(value: string) {
    this.terminal.write(value);
  }

  ngAfterViewInit(): void {
    this.terminal.open(this.container.nativeElement);
    this.observer.observe(this.container.nativeElement);
    this.fit.fit();
  }

  ngOnDestroy(): void {
    this.terminal.dispose();
    this.observer.disconnect();
  }
}
