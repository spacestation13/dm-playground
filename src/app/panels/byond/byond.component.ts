import { Component } from '@angular/core';
import { ByondService } from '../../../vm/byond.service';
import { AsyncPipe } from '@angular/common';
import { TuiLoaderModule } from '@taiga-ui/core';

@Component({
  selector: 'app-panel-byond',
  standalone: true,
  imports: [AsyncPipe, TuiLoaderModule],
  templateUrl: './byond.component.html',
  styleUrl: './byond.component.scss',
})
export default class ByondPanel {
  // noinspection JSUnusedGlobalSymbols
  static title = 'BYOND versions';

  constructor(protected byondService: ByondService) {}
}
