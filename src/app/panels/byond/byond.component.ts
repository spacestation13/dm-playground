import { Component, OnInit } from '@angular/core';
import { ByondService, VersionStatus } from '../../../vm/byond.service';
import { AsyncPipe } from '@angular/common';
import {
  TuiButtonModule,
  TuiGroupModule,
  TuiLoaderModule,
  TuiTextfieldControllerModule,
} from '@taiga-ui/core';
import { TuiBadgeModule, TuiInputNumberModule } from '@taiga-ui/kit';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';

@Component({
  selector: 'app-panel-byond',
  standalone: true,
  imports: [
    AsyncPipe,
    TuiLoaderModule,
    TuiButtonModule,
    TuiBadgeModule,
    TuiInputNumberModule,
    ReactiveFormsModule,
    TuiGroupModule,
    TuiTextfieldControllerModule,
  ],
  templateUrl: './byond.component.html',
  styleUrl: './byond.component.scss',
})
export default class ByondPanel implements OnInit {
  // noinspection JSUnusedGlobalSymbols
  static title = 'BYOND versions';

  protected form;

  constructor(
    protected byondService: ByondService,
    formBuilder: NonNullableFormBuilder,
  ) {
    this.form = formBuilder.group({
      major: new FormControl(0),
      minor: new FormControl(0),
    });
  }

  ngOnInit(): void {
    this.byondService.latestVersion.then(({ stable }) => {
      const [major, minor] = stable.split('.').map((x) => parseInt(x));
      this.form.setControl('major', new FormControl(major));
      this.form.setControl('minor', new FormControl(minor));
    });
  }

  protected resolveVersion() {
    return `${this.form.value.major}.${this.form.value.minor}`;
  }

  protected statusToMessage: Record<VersionStatus, string> = {
    [VersionStatus.Fetching]: 'Downloading...',
    [VersionStatus.Fetched]: 'Downloaded',
    [VersionStatus.Loading]: 'Loading...',
    [VersionStatus.Loaded]: 'Loaded',
  };
}
