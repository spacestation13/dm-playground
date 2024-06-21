import {
  TuiAlertModule,
  TuiButtonModule,
  TuiDialogModule,
  TuiModeModule,
  TuiRootModule,
  TuiThemeNightModule,
} from '@taiga-ui/core';
import { Component } from '@angular/core';
import { EditorComponent } from './components/editor/editor.component';
import { TerminalComponent } from './components/terminal/terminal.component';
import { EditorPageComponent } from './pages/editor-page/editor-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    TuiRootModule,
    TuiDialogModule,
    TuiAlertModule,
    TuiButtonModule,
    EditorComponent,
    TerminalComponent,
    EditorPageComponent,
    TuiModeModule,
    TuiThemeNightModule,
    TuiModeModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
