import { Component, Input } from '@angular/core';
import { AngularSplitModule } from 'angular-split';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [AngularSplitModule],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.scss',
})
export class PanelComponent {
  @Input({ required: true })
  public title!: string;
}
