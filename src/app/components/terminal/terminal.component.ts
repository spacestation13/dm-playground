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

  constructor() {}

  public write(value: string) {
    this.terminal.write(value);
  }

  private terminal = new Terminal();

  ngAfterViewInit(): void {
    this.terminal.open(this.container.nativeElement);
    this.terminal.onData((value) => this.input.emit(value));
  }

  ngOnDestroy(): void {
    this.terminal.dispose();
  }
}
