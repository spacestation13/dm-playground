import { Component } from '@angular/core';
import { EditorComponent } from '../../components/editor/editor.component';

@Component({
  selector: 'app-panel-editor',
  standalone: true,
  imports: [EditorComponent],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss',
})
export default class EditorPanel {
  // noinspection JSUnusedGlobalSymbols
  static title = 'Console';
}
