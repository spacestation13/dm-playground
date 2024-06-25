import { Component, Input } from '@angular/core';
import { AngularSplitModule } from 'angular-split';
import { AsyncPipe, NgComponentOutlet } from '@angular/common';
import { TuiLoaderModule } from '@taiga-ui/core';

export enum Panel {
  Console,
  Screen,
  Controller,
  Editor,
  Output,
  Byond,
}

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [AngularSplitModule, NgComponentOutlet, AsyncPipe, TuiLoaderModule],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.scss',
})
export class PanelComponent {
  @Input()
  public title?: string;
  protected panelComponent?: Promise<{
    default: PanelConstructor;
  }>;

  @Input()
  public set id(panel: Panel) {
    switch (panel) {
      case Panel.Controller:
        this.panelComponent = import(
          '../../panels/controller/controller.component'
        );
        break;
      case Panel.Console:
        this.panelComponent = import('../../panels/console/console.component');
        break;
      case Panel.Editor:
        this.panelComponent = import('../../panels/editor/editor.component');
        break;
      case Panel.Screen:
        this.panelComponent = import('../../panels/screen/screen.component');
        break;
      case Panel.Output:
        this.panelComponent = import('../../panels/output/output.component');
        break;
      case Panel.Byond:
        this.panelComponent = import('../../panels/byond/byond.component');
        break;
    }
  }
}

export interface PanelConstructor {
  title: string;

  new (...args: any[]): {};
}
