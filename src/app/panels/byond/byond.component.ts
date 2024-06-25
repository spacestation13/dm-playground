import { Component } from '@angular/core';
import { ByondService, VersionStatus } from '../../../vm/byond.service';
import { AsyncPipe } from '@angular/common';
import { TuiButtonModule, TuiLoaderModule } from '@taiga-ui/core';
import { TuiBadgeModule } from '@taiga-ui/kit';

@Component({
  selector: 'app-panel-byond',
  standalone: true,
  imports: [AsyncPipe, TuiLoaderModule, TuiButtonModule, TuiBadgeModule],
  templateUrl: './byond.component.html',
  styleUrl: './byond.component.scss',
})
export default class ByondPanel {
  // noinspection JSUnusedGlobalSymbols
  static title = 'BYOND versions';

  constructor(protected byondService: ByondService) {}

  protected statusToMessage: Record<VersionStatus, string> = {
    [VersionStatus.Fetching]: 'Downloading...',
    [VersionStatus.Fetched]: 'Downloaded',
    [VersionStatus.Loading]: 'Loading...',
    [VersionStatus.Extracting]: 'Extracting...',
    [VersionStatus.Loaded]: 'Loaded',
  };
}
