import {
  TuiAlertModule,
  TuiButtonModule,
  TuiDialogModule,
  TuiRootModule,
} from '@taiga-ui/core';
import { Component, DestroyRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ExecutorService } from '../vm/executor.service';
import { EditorComponent } from './components/editor/editor.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  protected output = '';

  constructor(executor: ExecutorService, destroyRef: DestroyRef) {
    executor.output.pipe(takeUntilDestroyed(destroyRef)).subscribe((value) => {
      console.log(value);
      this.output += value;
    });
  }
}
