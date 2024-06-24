import { Component } from '@angular/core';

@Component({
  selector: 'app-panel-byond',
  standalone: true,
  imports: [],
  templateUrl: './byond.component.html',
  styleUrl: './byond.component.scss',
})
export default class ByondPanel {
  // noinspection JSUnusedGlobalSymbols
  static title = 'BYOND versions';
}
